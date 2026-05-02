import Foundation

@MainActor
enum UserService {
    private static var api: APIClient { APIClient.shared }

    // MARK: - Search & Profile

    static func searchUsers(query: String) async throws -> [UserSearchResult] {
        guard !query.trimmingCharacters(in: .whitespaces).isEmpty else { return [] }
        return try await api.get("/users/search?query=\(query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? query)")
    }

    static func getProfile(userId: String) async throws -> UserProfile {
        try await api.get("/users/profile/\(userId)")
    }

    // MARK: - Username

    static func updateUsername(_ username: String) async throws {
        try await api.putVoid("/users/username", body: ["username": username.trimmingCharacters(in: .whitespaces)])
    }

    static func checkUsernameAvailable(_ username: String) async throws -> Bool {
        struct Response: Decodable { let available: Bool }
        let encoded = username.trimmingCharacters(in: .whitespaces)
            .addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? username
        let result: Response = try await api.get("/users/check-username/\(encoded)")
        return result.available
    }

    // MARK: - Profile Picture

    struct ProfilePictureResponse: Decodable {
        let profilePictureUrl: String
        enum CodingKeys: String, CodingKey {
            case profilePictureUrl = "profile_picture_url"
        }
    }

    static func uploadProfilePicture(imageData: Data) async throws -> String {
        let result: ProfilePictureResponse = try await api.uploadMultipartPut(
            "/users/profile-picture",
            fileField: "file",
            fileData: imageData,
            fileName: "profile_\(Int(Date().timeIntervalSince1970)).jpg"
        )
        return result.profilePictureUrl
    }

    // MARK: - Notification Settings

    static func getNotificationSettings() async throws -> NotificationSettings {
        try await api.get("/users/notification-settings")
    }

    static func updateNotificationSettings(_ settings: NotificationSettings) async throws {
        try await api.putVoid("/users/notification-settings", body: settings)
    }

    // MARK: - Push Token

    static func updatePushToken(_ token: String) async throws {
        try await api.putVoid("/users/push-token", body: ["push_token": token])
    }

    // MARK: - Friends

    static func getFriendships() async throws -> [Friendship] {
        try await api.get("/friends/")
    }

    static func getAcceptedFriendIds() async throws -> [String] {
        let result: AcceptedFriendIds = try await api.get("/friends/accepted-ids")
        return result.friendIds
    }

    static func sendFriendRequest(friendId: String) async throws {
        try await api.postVoid("/friends/request", body: ["friend_id": friendId])
    }

    static func acceptFriendRequest(friendshipId: String) async throws {
        try await api.putVoid("/friends/accept", body: ["friendship_id": friendshipId])
    }

    static func rejectFriendRequest(friendshipId: String) async throws {
        try await api.delete("/friends/reject", body: ["friendship_id": friendshipId])
    }

    static func removeFriend(friendId: String) async throws {
        try await api.delete("/friends/\(friendId)")
    }

    // MARK: - Blocks & Reports

    static func blockUser(blockedId: String) async throws {
        try await api.postVoid("/blocks/", body: ["blocked_id": blockedId])
    }

    static func unblockUser(userId: String) async throws {
        try await api.delete("/blocks/\(userId)")
    }

    struct BlockedUser: Decodable, Identifiable {
        let id: String
        let username: String
        let profilePictureUrl: String?
        enum CodingKeys: String, CodingKey {
            case id, username
            case profilePictureUrl = "profile_picture_url"
        }
    }

    static func getBlockedUsers() async throws -> [BlockedUser] {
        try await api.get("/blocks/")
    }

    static func reportContent(reportedUserId: String, postId: String? = nil, reason: String, details: String? = nil) async throws {
        var body: [String: String?] = [
            "reported_user_id": reportedUserId,
            "reason": reason,
        ]
        body["post_id"] = postId
        body["details"] = details

        // Encode manually since we need optional values
        struct ReportBody: Encodable {
            let reportedUserId: String
            let postId: String?
            let reason: String
            let details: String?
            enum CodingKeys: String, CodingKey {
                case reportedUserId = "reported_user_id"
                case postId = "post_id"
                case reason, details
            }
        }

        try await api.postVoid("/blocks/report", body: ReportBody(
            reportedUserId: reportedUserId,
            postId: postId,
            reason: reason,
            details: details
        ))
    }
}
