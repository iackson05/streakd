import SwiftUI

struct EditProfileView: View {
    @Environment(AuthViewModel.self) private var auth
    @Environment(\.dismiss) private var dismiss
    @State private var username = ""
    @State private var isChecking = false
    @State private var isAvailable: Bool?
    @State private var isSaving = false
    @State private var debounceTask: Task<Void, Never>?

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            VStack(spacing: 24) {
                // Profile Picture
                VStack(spacing: 12) {
                    AsyncImage(url: URL(string: auth.user?.profilePictureUrl ?? "")) { image in
                        image.resizable().scaledToFill()
                    } placeholder: {
                        Circle().fill(Color.cardBackground)
                            .overlay {
                                Image(systemName: "person.fill")
                                    .font(.largeTitle)
                                    .foregroundStyle(.white.opacity(0.3))
                            }
                    }
                    .frame(width: 80, height: 80)
                    .clipShape(Circle())
                    .overlay(Circle().stroke(Color.white.opacity(0.2), lineWidth: 2))

                    // TODO: Add photo picker for profile picture
                    Button("Change Photo") {}
                        .font(.subheadline)
                        .foregroundStyle(Color.brand)
                }
                .padding(.top, 20)

                // Username
                VStack(alignment: .leading, spacing: 8) {
                    Text("Username")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundStyle(.white.opacity(0.6))

                    HStack {
                        TextField("username", text: $username)
                            .textFieldStyle(StreakdTextFieldStyle())
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                            .onChange(of: username) { _, newValue in
                                checkUsername(newValue)
                            }

                        if isChecking {
                            ProgressView().tint(.white)
                        } else if let available = isAvailable {
                            Image(systemName: available ? "checkmark.circle.fill" : "xmark.circle.fill")
                                .foregroundStyle(available ? .green : .red)
                        }
                    }
                }

                // Save Button
                Button {
                    Task { await saveChanges() }
                } label: {
                    if isSaving {
                        ProgressView().tint(.white)
                    } else {
                        Text("Save")
                            .fontWeight(.bold)
                    }
                }
                .buttonStyle(BrandButtonStyle())
                .disabled(isSaving || isAvailable == false)

                Spacer()
            }
            .padding(.horizontal, 28)
        }
        .navigationTitle("Edit Profile")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(.black, for: .navigationBar)
        .toolbarBackground(.visible, for: .navigationBar)
        .onAppear {
            username = auth.user?.username ?? ""
        }
    }

    private func checkUsername(_ value: String) {
        debounceTask?.cancel()

        guard value != auth.user?.username else {
            isAvailable = nil
            return
        }

        // Match the server-side regex (3-50 alphanumerics or underscore)
        let pattern = "^[a-zA-Z0-9_]{3,50}$"
        if value.range(of: pattern, options: .regularExpression) == nil {
            isAvailable = false
            isChecking = false
            return
        }

        debounceTask = Task {
            try? await Task.sleep(for: .milliseconds(400))
            guard !Task.isCancelled else { return }

            isChecking = true
            isAvailable = try? await UserService.checkUsernameAvailable(value)
            isChecking = false
        }
    }

    private func saveChanges() async {
        isSaving = true
        do {
            if username != auth.user?.username {
                try await UserService.updateUsername(username)
            }
            await auth.refreshProfile()
            dismiss()
        } catch {
            print("Error saving: \(error)")
        }
        isSaving = false
    }
}
