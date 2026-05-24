import SwiftUI

struct ResetPasswordView: View {
    @Environment(\.dismiss) private var dismiss
    let email: String
    var onResetComplete: (() -> Void)?
    @State private var digits: [String] = Array(repeating: "", count: 6)
    @State private var newPassword = ""
    @State private var confirmPassword = ""
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showSuccess = false
    @FocusState private var focusedIndex: Int?

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            ScrollView {
                VStack(spacing: 0) {
                    VStack(spacing: 12) {
                        Text("Enter reset code")
                            .font(.title.bold())
                            .foregroundStyle(.white)

                        Text("Enter the 6-digit code sent to \(email) and choose a new password.")
                            .font(.subheadline)
                            .foregroundStyle(.white.opacity(0.5))
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 20)
                    }
                    .padding(.top, 60)
                    .padding(.bottom, 32)

                    // Code input
                    HStack(spacing: 10) {
                        ForEach(0..<6, id: \.self) { index in
                            TextField("", text: $digits[index])
                                .frame(width: 48, height: 56)
                                .multilineTextAlignment(.center)
                                .font(.title.bold())
                                .foregroundStyle(.white)
                                .keyboardType(.numberPad)
                                .focused($focusedIndex, equals: index)
                                .background(
                                    RoundedRectangle(cornerRadius: 12)
                                        .fill(digits[index].isEmpty
                                              ? Color.white.opacity(0.05)
                                              : Color.brand.opacity(0.08))
                                )
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(digits[index].isEmpty
                                                ? Color.white.opacity(0.1)
                                                : Color.brand, lineWidth: 1)
                                )
                                .onChange(of: digits[index]) { _, newValue in
                                    handleInput(at: index, value: newValue)
                                }
                        }
                    }
                    .disabled(isLoading)
                    .padding(.bottom, 32)

                    // Password fields
                    VStack(spacing: 20) {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("New Password")
                                .font(.caption)
                                .fontWeight(.semibold)
                                .foregroundStyle(.white.opacity(0.6))

                            SecureField("Min 8 characters", text: $newPassword)
                                .textFieldStyle(StreakdTextFieldStyle())
                                .textContentType(.newPassword)
                                .disabled(isLoading)
                        }

                        VStack(alignment: .leading, spacing: 8) {
                            Text("Confirm New Password")
                                .font(.caption)
                                .fontWeight(.semibold)
                                .foregroundStyle(.white.opacity(0.6))

                            SecureField("Re-enter password", text: $confirmPassword)
                                .textFieldStyle(StreakdTextFieldStyle())
                                .textContentType(.newPassword)
                                .disabled(isLoading)
                        }

                        if let errorMessage {
                            Text(errorMessage)
                                .font(.caption)
                                .foregroundStyle(.red)
                        }

                        Button {
                            Task { await handleReset() }
                        } label: {
                            if isLoading {
                                ProgressView().tint(.white)
                            } else {
                                Text("Reset Password").fontWeight(.bold)
                            }
                        }
                        .buttonStyle(BrandButtonStyle())
                        .disabled(isLoading || !isFormValid)
                    }
                    .padding(.horizontal, 28)
                    .padding(.bottom, 40)
                }
            }
        }
        .navigationBarBackButtonHidden()
        .toolbar {
            ToolbarItem(placement: .navigationBarLeading) {
                Button("Back") { dismiss() }
                    .foregroundStyle(Color.brand)
            }
        }
        .onAppear { focusedIndex = 0 }
        .alert("Password Reset", isPresented: $showSuccess) {
            Button("OK") {
                onResetComplete?() ?? dismiss()
            }
        } message: {
            Text("Your password has been reset. Please log in with your new password.")
        }
    }

    private var isFormValid: Bool {
        digits.allSatisfy({ !$0.isEmpty }) && newPassword.count >= 8 && newPassword == confirmPassword
    }

    private func handleInput(at index: Int, value: String) {
        let filtered = value.filter { $0.isNumber }

        if filtered.count > 1 {
            let chars = Array(filtered.prefix(6))
            for i in 0..<min(chars.count, 6) {
                digits[i] = String(chars[i])
            }
            focusedIndex = min(chars.count, 5)
            return
        }

        digits[index] = String(filtered.prefix(1))

        if !filtered.isEmpty && index < 5 {
            focusedIndex = index + 1
        }
    }

    private func handleReset() async {
        let code = digits.joined()
        guard code.count == 6 else {
            errorMessage = "Please enter the full 6-digit code."
            return
        }
        guard newPassword.count >= 8 else {
            errorMessage = "Password must be at least 8 characters."
            return
        }
        guard newPassword == confirmPassword else {
            errorMessage = "Passwords do not match."
            return
        }

        isLoading = true
        errorMessage = nil

        do {
            try await AuthService.resetPassword(email: email, code: code, newPassword: newPassword)
            showSuccess = true
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }
}
