import Foundation

struct Goal: Codable, Identifiable, Equatable, Hashable {
    let id: String
    let userId: String
    let title: String
    let description: String?
    var completed: Bool
    var archived: Bool
    let privacy: String
    var streakCount: Int
    let streakInterval: Int?
    let notificationTime: String?
    var lastPostedAt: String?
    let createdAt: String?

    enum CodingKeys: String, CodingKey {
        case id, title, description, completed, archived, privacy
        case userId = "user_id"
        case streakCount = "streak_count"
        case streakInterval = "streak_interval"
        case notificationTime = "notification_time"
        case lastPostedAt = "last_posted_at"
        case createdAt = "created_at"
    }
}

struct CreateGoalRequest: Encodable {
    let title: String
    let description: String?
    let privacy: String
    let streakInterval: Int

    enum CodingKeys: String, CodingKey {
        case title, description, privacy
        case streakInterval = "streak_interval"
    }
}
