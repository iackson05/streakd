import Foundation

@MainActor
enum PostService {
    private static var api: APIClient { APIClient.shared }

    static func getFeedPosts() async throws -> [Post] {
        try await api.get("/posts/feed")
    }

    static func getGoalPosts(goalId: String) async throws -> [Post] {
        try await api.get("/posts/goal/\(goalId)")
    }

    static func createPost(goalId: String, imageData: Data) async throws -> Post {
        try await api.uploadMultipart(
            "/posts/",
            fields: ["goal_id": goalId],
            fileField: "image",
            fileData: imageData,
            fileName: "post_\(Int(Date().timeIntervalSince1970)).jpg"
        )
    }

    static func deletePost(_ postId: String) async throws {
        try await api.delete("/posts/\(postId)")
    }

    static func getUserReactions(postIds: [String]) async throws -> [String: String] {
        guard !postIds.isEmpty else { return [:] }

        let joined = postIds.joined(separator: ",")
        let reactions: [UserReaction] = try await api.get("/reactions/user?post_ids=\(joined)")

        var map: [String: String] = [:]
        for r in reactions {
            map[r.postId] = r.reactEmoji
        }
        return map
    }

    static func toggleReaction(postId: String, emoji: String) async throws {
        try await api.postVoid("/reactions/toggle", body: [
            "post_id": postId,
            "react_emoji": emoji,
        ])
    }
}
