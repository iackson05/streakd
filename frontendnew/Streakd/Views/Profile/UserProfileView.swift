import SwiftUI

struct UserProfileView: View {
    let userId: String
    let username: String

    @Environment(AuthViewModel.self) private var auth
    @Environment(FriendsViewModel.self) private var friendsVM
    @Environment(\.dismiss) private var dismiss

    @State private var profile: UserProfile?
    @State private var isLoading = true
    @State private var friendshipStatus: FriendshipStatus = .none
    @State private var actionLoading = false
    @State private var showReportSheet = false

    enum FriendshipStatus {
        case none, pendingSent, pendingReceived, accepted
    }

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            if isLoading {
                ProgressView().tint(.white)
            } else if let profile {
                ScrollView {
                    VStack(spacing: 0) {
                        // Profile Card
                        VStack(spacing: 16) {
                            AsyncImage(url: URL(string: profile.profilePictureUrl ?? "")) { image in
                                image.resizable().scaledToFill()
                            } placeholder: {
                                Circle().fill(Color.cardBackground)
                                    .overlay {
                                        Image(systemName: "person.fill")
                                            .font(.largeTitle)
                                            .foregroundStyle(.white.opacity(0.3))
                                    }
                            }
                            .frame(width: 96, height: 96)
                            .clipShape(Circle())
                            .overlay(Circle().stroke(Color.white.opacity(0.2), lineWidth: 2))

                            VStack(spacing: 4) {
                                if let name = profile.name, !name.isEmpty {
                                    Text(name)
                                        .font(.title3).fontWeight(.semibold)
                                        .foregroundStyle(profile.isSubscribed ? Color.brand : .white)
                                }
                                Text("@\(profile.username)")
                                    .font(.subheadline)
                                    .foregroundStyle(
                                        profile.name != nil
                                            ? (profile.isSubscribed ? Color.brand : .white.opacity(0.5))
                                            : (profile.isSubscribed ? Color.brand : .white)
                                    )
                                    .fontWeight(profile.name == nil ? .semibold : .regular)
                            }

                            // Stats
                            HStack(spacing: 4) {
                                Image(systemName: "person.2")
                                    .font(.caption2)
                                    .foregroundStyle(.white.opacity(0.5))
                                Text("\(profile.friendCount)")
                                    .font(.body).fontWeight(.semibold).foregroundStyle(.white)
                                Text("Friends")
                                    .font(.caption).foregroundStyle(.white.opacity(0.4))
                            }

                            // Friend action button
                            friendButton
                        }
                        .padding(24)
                        .frame(maxWidth: .infinity)
                        .background(Color(white: 0.04))
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                        .overlay(
                            RoundedRectangle(cornerRadius: 16)
                                .stroke(Color.cardBorder, lineWidth: 1)
                        )
                        .padding(16)
                    }
                    .padding(.top, 16)
                }
            } else {
                Text("User not found")
                    .foregroundStyle(.white.opacity(0.5))
            }
        }
        .navigationTitle("@\(username)")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(.black, for: .navigationBar)
        .toolbarBackground(.visible, for: .navigationBar)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    Button("Report User") { showReportSheet = true }
                    Button("Block User", role: .destructive) { blockUser() }
                } label: {
                    Image(systemName: "ellipsis")
                        .foregroundStyle(.white.opacity(0.7))
                }
            }
        }
        .confirmationDialog("Report User", isPresented: $showReportSheet) {
            Button("Inappropriate Content") { submitReport("inappropriate") }
            Button("Spam") { submitReport("spam") }
            Button("Harassment") { submitReport("harassment") }
            Button("Other") { submitReport("other") }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Why are you reporting this user?")
        }
        .task {
            await loadData()
        }
    }

    @ViewBuilder
    private var friendButton: some View {
        Group {
            if actionLoading {
                ProgressView().tint(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(Color.white.opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            } else {
                switch friendshipStatus {
                case .accepted:
                    Button {
                        removeFriend()
                    } label: {
                        HStack(spacing: 8) {
                            Image(systemName: "checkmark").font(.caption)
                            Text("Friends").fontWeight(.semibold)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .foregroundStyle(.black)
                        .background(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }

                case .pendingSent:
                    HStack(spacing: 8) {
                        Image(systemName: "clock").font(.caption)
                        Text("Pending").fontWeight(.medium)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .foregroundStyle(.white.opacity(0.7))
                    .background(Color.white.opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.white.opacity(0.2), lineWidth: 1))

                case .pendingReceived:
                    Button { addFriend() } label: {
                        HStack(spacing: 8) {
                            Image(systemName: "checkmark").font(.caption)
                            Text("Accept").fontWeight(.semibold)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .foregroundStyle(.black)
                        .background(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }

                case .none:
                    Button { addFriend() } label: {
                        HStack(spacing: 8) {
                            Image(systemName: "person.badge.plus").font(.caption)
                            Text("Add Friend").fontWeight(.semibold)
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 12)
                        .foregroundStyle(.black)
                        .background(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                }
            }
        }
    }

    // MARK: - Data Loading

    private func loadData() async {
        do {
            async let profileResult = UserService.getProfile(userId: userId)
            async let friendshipsResult = UserService.getFriendships()
            let (p, friendships) = try await (profileResult, friendshipsResult)
            profile = p

            // Don't compute a friendship status when viewing your own profile —
            // the friendships list contains other people, and matching by
            // userId/friendId could accidentally pick one up.
            guard userId != auth.user?.id else {
                isLoading = false
                return
            }

            if let f = friendships.first(where: {
                ($0.userId == userId || $0.friendId == userId)
            }) {
                let sentByMe = f.userId == auth.user?.id
                if f.status == "accepted" {
                    friendshipStatus = .accepted
                } else if f.status == "pending" {
                    friendshipStatus = sentByMe ? .pendingSent : .pendingReceived
                }
            }
        } catch {
            print("Error loading user profile: \(error)")
        }
        isLoading = false
    }

    // MARK: - Actions

    private func addFriend() {
        actionLoading = true
        Task {
            do {
                try await UserService.sendFriendRequest(friendId: userId)
                friendshipStatus = .pendingSent
                friendsVM.invalidate()
            } catch {
                print("Error: \(error)")
            }
            actionLoading = false
        }
    }

    private func removeFriend() {
        actionLoading = true
        Task {
            do {
                try await UserService.removeFriend(friendId: userId)
                friendshipStatus = .none
                friendsVM.invalidate()
            } catch {
                print("Error: \(error)")
            }
            actionLoading = false
        }
    }

    private func blockUser() {
        Task {
            do {
                try await UserService.blockUser(blockedId: userId)
                friendsVM.invalidate()
                dismiss()
            } catch {
                print("Error blocking user: \(error)")
            }
        }
    }

    private func submitReport(_ reason: String) {
        Task {
            try? await UserService.reportContent(reportedUserId: userId, reason: reason)
        }
    }
}
