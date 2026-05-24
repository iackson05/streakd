import SwiftUI

struct ForgotPasswordView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var email = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showResetView = false

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            VStack(spacing: 0) {
                Spacer()

                VStack(spacing: 12) {
                    Text("Reset password")
                        .font(.title.bold())
                        .foregroundStyle(.white)

                    Text("Enter your email address and we'll send you a code to reset your password.")
                        .font(.subheadline)
                        .foregroundStyle(.white.opacity(0.5))
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 20)
                }
                .padding(.bottom, 40)

                VStack(spacing: 20) {
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

                    if let errorMessage {
                        Text(errorMessage)
                            .font(.caption)
                            .foregroundStyle(.red)
                    }

                    Button {
                        Task { await handleSend() }
                    } label: {
                        if isLoading {
                            ProgressView().tint(.white)
                        } else {
                            Text("Send Reset Code").fontWeight(.bold)
                        }
                    }
                    .buttonStyle(BrandButtonStyle())
                    .disabled(isLoading || email.isEmpty)
                }
                .padding(.horizontal, 28)

                Spacer()
            }
        }
        .navigationBarBackButtonHidden()
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                Button("Back") { dismiss() }
                    .foregroundStyle(Color.brand)
            }
        }
        .navigationDestination(isPresented: $showResetView) {
            ResetPasswordView(
                email: email.trimmingCharacters(in: .whitespaces).lowercased(),
                onResetComplete: { dismiss() }
            )
        }
    }

    private func handleSend() async {
        let trimmed = email.trimmingCharacters(in: .whitespaces).lowercased()
        guard trimmed.contains("@"), trimmed.contains(".") else {
            errorMessage = "Please enter a valid email address."
            return
        }

        isLoading = true
        errorMessage = nil

        do {
            try await AuthService.forgotPassword(email: trimmed)
            showResetView = true
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }
}
