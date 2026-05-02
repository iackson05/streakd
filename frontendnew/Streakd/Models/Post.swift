import Foundation

struct Post: Codable, Identifiable, Equatable {
    let id: String
    let userId: String
    let goalId: String
    let imageUrl: String?
    let caption: String?
    let createdAt: String?
    var reactionFire: Int
    var reactionFist: Int
    var reactionParty: Int
    var reactionHeart: Int

    // Joined fields from backend feed query
    let username: String?
    let profilePictureUrl: String?
    let goalTitle: String?
    let streakCount: Int?
    let postUserIsSubscribed: Bool?

    enum CodingKeys: String, CodingKey {
        case id, caption, username
        case userId = "user_id"
        case goalId = "goal_id"
        case imageUrl = "image_url"
        case createdAt = "created_at"
        case reactionFire = "reaction_fire"
        case reactionFist = "reaction_fist"
        case reactionParty = "reaction_party"
        case reactionHeart = "reaction_heart"
        case profilePictureUrl = "profile_picture_url"
        case goalTitle = "goal_title"
        case streakCount = "streak_count"
        case postUserIsSubscribed = "post_user_is_subscribed"
    }
}

struct UserReaction: Codable {
    let postId: String
    let reactEmoji: String

    enum CodingKeys: String, CodingKey {
        case postId = "post_id"
        case reactEmoji = "react_emoji"
    }
}
