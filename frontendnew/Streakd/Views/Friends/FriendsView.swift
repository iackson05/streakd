import SwiftUI

struct FriendsView: View {
    @Environment(AuthViewModel.self) private var auth
    @Environment(FriendsViewModel.self) private var friendsVM

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            ScrollView {
                VStack(spacing: 24) {
                    // Pending Requests
                    if !friendsVM.pendingRequests.isEmpty {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Friend Requests")
                                .font(.headline)
                                .foregroundStyle(.white)

                            ForEach(friendsVM.pendingRequests) { request in
                                friendRequestRow(request)
                            }
                        }
                    }

                    // Friends List
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Text("Friends")
                                .font(.headline)
                                .foregroundStyle(.white)

                            Spacer()

                            NavigationLink {
                                AddFriendsView()
                            } label: {
                                Image(systemName: "person.badge.plus")
                                    .foregroundStyle(Color.brand)
                            }
                        }

                        if friendsVM.friends.isEmpty && friendsVM.pendingRequests.isEmpty {
                            VStack(spacing: 8) {
                                Text("No friends yet")
                                    .font(.headline)
                                    .foregroundStyle(.white.opacity(0.6))
                                Text("Search for friends to get started")
                                    .font(.subheadline)
                                    .foregroundStyle(.white.opacity(0.35))
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 40)
                        } else {
                            ForEach(friendsVM.friends) { friend in
                                friendRow(friend)
                            }
                        }
                    }
                }
                .padding(16)
            }
        }
        .navigationTitle("Friends")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(.black, for: .navigationBar)
        .toolbarBackground(.visible, for: .navigationBar)
        .task {
            if let userId = auth.user?.id {
                await friendsVM.loadFriends(currentUserId: userId)
            }
        }
    }

    @ViewBuilder
    private func friendRow(_ friend: FriendInfo) -> some View {
        HStack(spacing: 12) {
            AsyncImage(url: URL(string: friend.profilePictureUrl ?? "")) { image in
                image.resizable().scaledToFill()
            } placeholder: {
                Circle().fill(Color.cardBackground)
            }
            .frame(width: 44, height: 44)
            .clipShape(Circle())

            HStack(spacing: 4) {
                Text(friend.username)
                    .font(.body)
                    .fontWeight(.medium)
                    .foregroundStyle(.white)

                if friend.isSubscribed {
                    Image(systemName: "checkmark.seal.fill")
                        .font(.caption2)
                        .foregroundStyle(Color.brand)
                }
            }

            Spacer()
        }
        .padding(12)
        .background(Color.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.cardBorder, lineWidth: 1))
    }

    @ViewBuilder
    private func friendRequestRow(_ request: PendingRequest) -> some View {
        HStack(spacing: 12) {
            AsyncImage(url: URL(string: request.profilePictureUrl ?? "")) { image in
                image.resizable().scaledToFill()
            } placeholder: {
                Circle().fill(Color.cardBackground)
            }
            .frame(width: 44, height: 44)
            .clipShape(Circle())

            Text(request.username)
                .font(.body)
                .fontWeight(.medium)
                .foregroundStyle(.white)

            Spacer()

            Button {
                Task { try? await friendsVM.acceptRequest(request) }
            } label: {
                Text("Accept")
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundStyle(.white)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 8)
                    .background(Color.brand)
                    .clipShape(Capsule())
            }

            Button {
                Task { try? await friendsVM.rejectRequest(request) }
            } label: {
                Image(systemName: "xmark")
                    .font(.caption)
                    .foregroundStyle(.white.opacity(0.5))
                    .padding(8)
                    .background(Color.white.opacity(0.1))
                    .clipShape(Circle())
            }
        }
        .padding(12)
        .background(Color.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.cardBorder, lineWidth: 1))
    }
}
