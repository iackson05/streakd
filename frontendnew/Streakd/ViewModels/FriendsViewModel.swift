import Foundation
import SwiftUI

@MainActor
@Observable
final class FriendsViewModel {
    var friends: [FriendInfo] = []
    var pendingRequests: [PendingRequest] = []
    var isLoading = false

    private var lastFetch: Date?
    private let debounceInterval: TimeInterval = 30

    func loadFriends(currentUserId: String, force: Bool = false) async {
        if !force, let last = lastFetch, Date().timeIntervalSince(last) < debounceInterval {
            return
        }

        isLoading = friends.isEmpty && pendingRequests.isEmpty

        do {
            let friendships = try await UserService.getFriendships()

            var newFriends: [FriendInfo] = []
            var newPending: [PendingRequest] = []

            for f in friendships {
                let sentByMe = f.userId == currentUserId

                if f.status == "accepted" {
                    newFriends.append(FriendInfo(
                        id: sentByMe ? f.friendId : f.userId,
                        username: f.friendUsername ?? "Unknown",
                        profilePictureUrl: f.friendProfilePictureUrl,
                        isSubscribed: f.friendIsSubscribed ?? false
                    ))
                } else if f.status == "pending" && !sentByMe {
                    newPending.append(PendingRequest(
                        id: f.userId,
                        username: f.friendUsername ?? "Unknown",
                        profilePictureUrl: f.friendProfilePictureUrl,
                        isSubscribed: f.friendIsSubscribed ?? false,
                        senderId: f.userId,
                        friendshipId: f.id
                    ))
                }
            }

            friends = newFriends
            pendingRequests = newPending
            lastFetch = Date()
        } catch {
            print("Error loading friends: \(error)")
        }

        isLoading = false
    }

    func acceptRequest(_ request: PendingRequest) async throws {
        // friendshipId comes pre-resolved on the PendingRequest, so no extra fetch.
        try await UserService.acceptFriendRequest(friendshipId: request.friendshipId)

        // Optimistic update
        pendingRequests.removeAll { $0.senderId == request.senderId }
        friends.append(FriendInfo(
            id: request.id,
            username: request.username,
            profilePictureUrl: request.profilePictureUrl,
            isSubscribed: request.isSubscribed
        ))
    }

    func rejectRequest(_ request: PendingRequest) async throws {
        try await UserService.rejectFriendRequest(friendshipId: request.friendshipId)
        pendingRequests.removeAll { $0.senderId == request.senderId }
    }

    func removeFriend(_ friendId: String) async throws {
        try await UserService.removeFriend(friendId: friendId)
        friends.removeAll { $0.id == friendId }
    }

    func invalidate() {
        lastFetch = nil
    }
}
