import SwiftUI

struct LoginView: View {
    @Environment(AuthViewModel.self) private var auth
    @State private var email = ""
    @State private var password = ""
    @State private var isLoading = false
    @State private var errorMessage: String?

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
                            .frame(width: 120, height: 60)

                        Text("Welcome back")
                            .font(.subheadline)
                            .foregroundStyle(.white.opacity(0.5))
                    }
                    .padding(.top, 80)
                    .padding(.bottom, 52)

                    // Form
                    VStack(spacing: 20) {
                        // Email
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Email")
                                .font(.caption)
                                .fontWeight(.semibold)
                                .foregroundStyle(.white.opacity(0.6))

                            TextField("you@example.com", text: $email)
                                .textFieldStyle(StreakdTextFieldStyle())
                                .textContentType(.emailAddress)
                                .keyboardType(.emailAddress)
                                .textInputAutocapitalization(.never)
                                .disabled(isLoading)
                        }

                        // Password
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Password")
                                .font(.caption)
                                .fontWeight(.semibold)
                                .foregroundStyle(.white.opacity(0.6))

                            SecureField("", text: $password)
                                .textFieldStyle(StreakdTextFieldStyle())
                                .textContentType(.password)
                                .disabled(isLoading)
                        }

                        // Error
                        if let errorMessage {
                            Text(errorMessage)
                                .font(.caption)
                                .foregroundStyle(.red)
                                .multilineTextAlignment(.center)
                        }

                        // Login Button
                        Button {
                            Task { await handleLogin() }
                        } label: {
                            if isLoading {
                                ProgressView()
                                    .tint(.white)
                            } else {
                                Text("Log In")
                                    .fontWeight(.bold)
                            }
                        }
                        .buttonStyle(BrandButtonStyle())
                        .disabled(isLoading || email.isEmpty || password.isEmpty)

                        // Sign Up Link
                        HStack(spacing: 4) {
                            Text("Don't have an account?")
                                .foregroundStyle(.white.opacity(0.4))
                            NavigationLink("Sign up") {
                                SignUpView()
                            }
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

    private func handleLogin() async {
        guard !email.isEmpty, !password.isEmpty else {
            errorMessage = "Please enter both email and password"
            return
        }

        isLoading = true
        errorMessage = nil

        do {
            try await auth.signIn(email: email, password: password)
        } catch {
            if error.localizedDescription.contains("Invalid login") {
                errorMessage = "Incorrect email or password"
            } else {
                errorMessage = error.localizedDescription
            }
        }

        isLoading = false
    }
}

// MARK: - Shared Styles

struct StreakdTextFieldStyle: TextFieldStyle {
    func _body(configuration: TextField<Self._Label>) -> some View {
        configuration
            .padding(16)
            .background(Color.white.opacity(0.05))
            .foregroundStyle(.white)
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .stroke(Color.white.opacity(0.1), lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 14))
    }
}

struct BrandButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .frame(maxWidth: .infinity)
            .padding(.vertical, 17)
            .background(Color.brand)
            .foregroundStyle(.white)
            .font(.body.weight(.bold))
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .opacity(configuration.isPressed ? 0.8 : 1.0)
            .shadow(color: Color.brand.opacity(0.4), radius: 12, y: 4)
    }
}
