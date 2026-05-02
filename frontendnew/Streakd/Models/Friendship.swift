import Foundation

struct Friendship: Codable, Identifiable {
    let id: String
    let userId: String
    let friendId: String
    let status: String
    let createdAt: String?
    let friendUsername: String?
    let friendProfilePictureUrl: String?
    let friendIsSubscribed: Bool?

    enum CodingKeys: String, CodingKey {
        case id, status
        case userId = "user_id"
        case friendId = "friend_id"
        case createdAt = "created_at"
        case friendUsername = "friend_username"
        case friendProfilePictureUrl = "friend_profile_picture_url"
        case friendIsSubscribed = "friend_is_subscribed"
    }
}

struct FriendInfo: Identifiable, Equatable {
    let id: String
    let username: String
    let profilePictureUrl: String?
    let isSubscribed: Bool
}

struct PendingRequest: Identifiable, Equatable {
    let id: String
    let username: String
    let profilePictureUrl: String?
    let isSubscribed: Bool
    let senderId: String
    /// Friendship row id — needed to accept/reject without a re-fetch.
    let friendshipId: String
}

struct AcceptedFriendIds: Codable {
    let friendIds: [String]

    enum CodingKeys: String, CodingKey {
        case friendIds = "friend_ids"
    }
}
