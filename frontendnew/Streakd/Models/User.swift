import Foundation

struct User: Codable, Identifiable, Equatable {
    let id: String
    let username: String
    let name: String?
    let email: String
    let profilePictureUrl: String?
    let pushToken: String?
    let pushNotificationsEnabled: Bool?
    let isSubscribed: Bool
    let emailVerified: Bool
    let createdAt: String?

    enum CodingKeys: String, CodingKey {
        case id, username, name, email
        case profilePictureUrl = "profile_picture_url"
        case pushToken = "push_token"
        case pushNotificationsEnabled = "push_notifications_enabled"
        case isSubscribed = "is_subscribed"
        case emailVerified = "email_verified"
        case createdAt = "created_at"
    }
}

struct UserProfile: Codable {
    let id: String
    let username: String
    let name: String?
    let profilePictureUrl: String?
    let isSubscribed: Bool
    let friendCount: Int
    let postCount: Int
    let completedGoalsCount: Int
    let createdAt: String?

    enum CodingKeys: String, CodingKey {
        case id, username, name
        case profilePictureUrl = "profile_picture_url"
        case isSubscribed = "is_subscribed"
        case friendCount = "friend_count"
        case postCount = "post_count"
        case completedGoalsCount = "completed_goals_count"
        case createdAt = "created_at"
    }
}

/// Lightweight user returned by the search endpoint (only id, username, name, profile_picture_url).
struct UserSearchResult: Codable, Identifiable {
    let id: String
    let username: String
    let name: String?
    let profilePictureUrl: String?

    enum CodingKeys: String, CodingKey {
        case id, username, name
        case profilePictureUrl = "profile_picture_url"
    }
}

struct NotificationSettings: Codable {
    var friendRequests: Bool
    var reactions: Bool
    var streakReminders: Bool

    enum CodingKeys: String, CodingKey {
        case friendRequests = "friend_requests"
        case reactions
        case streakReminders = "streak_reminders"
    }
}
