import SwiftUI

struct BlockedUsersView: View {
    @State private var blockedUsers: [UserService.BlockedUser] = []
    @State private var isLoading = true
    @State private var error: String?

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            if isLoading {
                ProgressView().tint(.white)
            } else if let error {
                VStack(spacing: 8) {
                    Text("Couldn't load blocked users")
                        .font(.headline).foregroundStyle(.white.opacity(0.7))
                    Text(error)
                        .font(.caption).foregroundStyle(.red)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, 24)
                }
            } else if blockedUsers.isEmpty {
                VStack(spacing: 12) {
                    Image(systemName: "person.crop.circle.badge.checkmark")
                        .font(.system(size: 48))
                        .foregroundStyle(.white.opacity(0.3))

                    Text("No blocked users")
                        .font(.headline)
                        .foregroundStyle(.white.opacity(0.6))

                    Text("Users you block will appear here")
                        .font(.subheadline)
                        .foregroundStyle(.white.opacity(0.35))
                }
            } else {
                ScrollView {
                    LazyVStack(spacing: 8) {
                        ForEach(blockedUsers) { user in
                            HStack(spacing: 12) {
                                AsyncImage(url: URL(string: user.profilePictureUrl ?? "")) { image in
                                    image.resizable().scaledToFill()
                                } placeholder: {
                                    Circle().fill(Color.cardBackground)
                                }
                                .frame(width: 44, height: 44)
                                .clipShape(Circle())

                                Text(user.username)
                                    .font(.body)
                                    .fontWeight(.medium)
                                    .foregroundStyle(.white)

                                Spacer()

                                Button {
                                    unblock(user)
                                } label: {
                                    Text("Unblock")
                                        .font(.caption)
                                        .fontWeight(.semibold)
                                        .foregroundStyle(.red)
                                        .padding(.horizontal, 14)
                                        .padding(.vertical, 8)
                                        .background(Color.red.opacity(0.1))
                                        .clipShape(Capsule())
                                        .overlay(Capsule().stroke(Color.red.opacity(0.3), lineWidth: 1))
                                }
                            }
                            .padding(12)
                            .background(Color.cardBackground)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.cardBorder, lineWidth: 1))
                        }
                    }
                    .padding(16)
                }
            }
        }
        .navigationTitle("Blocked Users")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(.black, for: .navigationBar)
        .toolbarBackground(.visible, for: .navigationBar)
        .task {
            await loadBlockedUsers()
        }
    }

    private func loadBlockedUsers() async {
        do {
            blockedUsers = try await UserService.getBlockedUsers()
        } catch {
            self.error = error.localizedDescription
        }
        isLoading = false
    }

    private func unblock(_ user: UserService.BlockedUser) {
        Task {
            do {
                try await UserService.unblockUser(userId: user.id)
                blockedUsers.removeAll { $0.id == user.id }
            } catch {
                print("Error unblocking user: \(error)")
            }
        }
    }
}
