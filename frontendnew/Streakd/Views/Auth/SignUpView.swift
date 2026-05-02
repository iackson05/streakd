import SwiftUI

struct SignUpView: View {
    @Environment(AuthViewModel.self) private var auth
    @Environment(\.dismiss) private var dismiss
    @State private var email = ""
    @State private var password = ""
    @State private var username = ""
    @State private var name = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var isCheckingUsername = false
    @State private var isUsernameAvailable: Bool?
    @State private var usernameDebounce: Task<Void, Never>?

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            ScrollView {
                VStack(spacing: 0) {
                    // Header
                    VStack(spacing: 16) {
                        Image("streakdLogo")
                            .resizable()
                            .scaledToFit()
                            .frame(width: 100, height: 100)

                        Text("Create your account")
                            .font(.subheadline)
                            .foregroundStyle(.white.opacity(0.5))
                    }
                    .padding(.top, 40)
                    .padding(.bottom, 40)

                    // Form
                    VStack(spacing: 20) {
                        formField("Name", text: $name, contentType: .name)

                        // Username with availability check
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Username")
                                .font(.caption)
                                .fontWeight(.semibold)
                                .foregroundStyle(.white.opacity(0.6))

                            HStack {
                                TextField("Username", text: $username)
                                    .textFieldStyle(StreakdTextFieldStyle())
                                    .textContentType(.username)
                                    .textInputAutocapitalization(.never)
                                    .autocorrectionDisabled()
                                    .disabled(isLoading)
                                    .onChange(of: username) { _, newValue in
                                        checkUsername(newValue)
                                    }

                                if isCheckingUsername {
                                    ProgressView().tint(.white)
                                } else if let available = isUsernameAvailable {
                                    Image(systemName: available ? "checkmark.circle.fill" : "xmark.circle.fill")
                                        .foregroundStyle(available ? .green : .red)
                                }
                            }
                        }

                        formField("Email", text: $email, contentType: .emailAddress, keyboard: .emailAddress)

                        VStack(alignment: .leading, spacing: 8) {
                            Text("Password")
                                .font(.caption)
                                .fontWeight(.semibold)
                                .foregroundStyle(.white.opacity(0.6))

                            SecureField("Min 8 characters", text: $password)
                                .textFieldStyle(StreakdTextFieldStyle())
                                .textContentType(.newPassword)
                                .disabled(isLoading)
                        }

                        if let errorMessage {
                            Text(errorMessage)
                                .font(.caption)
                                .foregroundStyle(.red)
                                .multilineTextAlignment(.center)
                        }

                        Button {
                            Task { await handleSignUp() }
                        } label: {
                            if isLoading {
                                ProgressView()
                                    .tint(.white)
                            } else {
                                Text("Create Account")
                                    .fontWeight(.bold)
                            }
                        }
                        .buttonStyle(BrandButtonStyle())
                        .disabled(isLoading || !isFormValid)

                        HStack(spacing: 4) {
                            Text("Already have an account?")
                                .foregroundStyle(.white.opacity(0.4))
                            Button("Log in") { dismiss() }
                                .foregroundStyle(Color.brand)
                                .fontWeight(.bold)
                        }
                        .font(.footnote)
                        .padding(.top, 20)
                    }
                    .padding(.horizontal, 28)
                    .padding(.bottom, 40)
                }
            }
        }
        .navigationBarBackButtonHidden()
    }

    private var isFormValid: Bool {
        !email.isEmpty && !password.isEmpty && !username.isEmpty && !name.isEmpty && password.count >= 8 && isUsernameAvailable != false
    }

    @ViewBuilder
    private func formField(
        _ label: String,
        text: Binding<String>,
        contentType: UITextContentType,
        keyboard: UIKeyboardType = .default
    ) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(label)
                .font(.caption)
                .fontWeight(.semibold)
                .foregroundStyle(.white.opacity(0.6))

            TextField(label, text: text)
                .textFieldStyle(StreakdTextFieldStyle())
                .textContentType(contentType)
                .keyboardType(keyboard)
                .textInputAutocapitalization(.never)
                .disabled(isLoading)
        }
    }

    private func checkUsername(_ value: String) {
        usernameDebounce?.cancel()

        guard !value.isEmpty else {
            isUsernameAvailable = nil
            return
        }

        let pattern = "^[a-zA-Z0-9_]{3,50}$"
        if value.range(of: pattern, options: .regularExpression) == nil {
            isUsernameAvailable = false
            isCheckingUsername = false
            return
        }

        usernameDebounce = Task {
            try? await Task.sleep(for: .milliseconds(400))
            guard !Task.isCancelled else { return }

            isCheckingUsername = true
            isUsernameAvailable = try? await UserService.checkUsernameAvailable(value)
            isCheckingUsername = false
        }
    }

    private func handleSignUp() async {
        guard isFormValid else {
            errorMessage = "Please fill in all fields (password must be at least 8 characters)"
            return
        }

        isLoading = true
        errorMessage = nil

        do {
            try await auth.signUp(
                email: email.trimmingCharacters(in: .whitespaces),
                password: password,
                username: username.trimmingCharacters(in: .whitespaces).lowercased(),
                name: name.trimmingCharacters(in: .whitespaces)
            )
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }
}
