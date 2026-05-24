import SwiftUI

struct EmailVerificationView: View {
    @Environment(AuthViewModel.self) private var auth
    @State private var digits: [String] = Array(repeating: "", count: 6)
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var resendCooldown = 0
    @FocusState private var focusedIndex: Int?

    private let timer = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            VStack(spacing: 0) {
                Spacer()

                VStack(spacing: 12) {
                    Text("Verify your email")
                        .font(.title.bold())
                        .foregroundStyle(.white)

                    Text("We sent a 6-digit code to your email address. Enter it below to verify your account.")
                        .font(.subheadline)
                        .foregroundStyle(.white.opacity(0.5))
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 20)
                }
                .padding(.bottom, 40)

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

                if let errorMessage {
                    Text(errorMessage)
                        .font(.caption)
                        .foregroundStyle(.red)
                        .padding(.top, 16)
                }

                if isLoading {
                    ProgressView()
                        .tint(Color.brand)
                        .padding(.top, 24)
                }

                // Resend
                Button {
                    Task { await handleResend() }
                } label: {
                    Text(resendCooldown > 0
                         ? "Resend code in \(resendCooldown)s"
                         : "Resend code")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(resendCooldown > 0
                                         ? Color.white.opacity(0.3)
                                         : Color.brand)
                }
                .disabled(resendCooldown > 0)
                .padding(.top, 32)

                // Sign out
                Button {
                    auth.signOut()
                } label: {
                    Text("Use a different account")
                        .font(.footnote)
                        .foregroundStyle(.white.opacity(0.4))
                }
                .padding(.top, 16)

                Spacer()
            }
            .padding(.horizontal, 28)
        }
        .onAppear { focusedIndex = 0 }
        .onReceive(timer) { _ in
            if resendCooldown > 0 { resendCooldown -= 1 }
        }
    }

    private func handleInput(at index: Int, value: String) {
        let filtered = value.filter { $0.isNumber }

        if filtered.count > 1 {
            // Paste handling
            let chars = Array(filtered.prefix(6))
            for i in 0..<min(chars.count, 6) {
                digits[i] = String(chars[i])
            }
            let next = min(chars.count, 5)
            focusedIndex = next
            if digits.allSatisfy({ !$0.isEmpty }) {
                submitCode()
            }
            return
        }

        digits[index] = String(filtered.prefix(1))

        if !filtered.isEmpty && index < 5 {
            focusedIndex = index + 1
        }

        if digits.allSatisfy({ !$0.isEmpty }) {
            submitCode()
        }
    }

    private func submitCode() {
        let code = digits.joined()
        guard code.count == 6 else { return }

        isLoading = true
        errorMessage = nil

        Task {
            do {
                try await auth.verifyEmail(code: code)
            } catch {
                errorMessage = "Invalid or expired code. Please try again."
                digits = Array(repeating: "", count: 6)
                focusedIndex = 0
            }
            isLoading = false
        }
    }

    private func handleResend() async {
        do {
            try await auth.resendVerification()
            resendCooldown = 60
        } catch {
            errorMessage = "Failed to resend code. Please try again."
        }
    }
}
