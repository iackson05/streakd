import Foundation

@MainActor
enum GoalService {
    private static var api: APIClient { APIClient.shared }

    static func getAllGoals() async throws -> [Goal] {
        try await api.get("/goals/")
    }

    static func getActiveGoals() async throws -> [Goal] {
        try await api.get("/goals/active")
    }

    static func createGoal(title: String, description: String?, privacy: String = "friends", streakInterval: Int = 1) async throws -> Goal {
        let body = CreateGoalRequest(
            title: title.trimmingCharacters(in: .whitespaces),
            description: description?.trimmingCharacters(in: .whitespaces),
            privacy: privacy,
            streakInterval: streakInterval
        )
        return try await api.post("/goals/", body: body)
    }

    static func deleteGoal(_ goalId: String) async throws {
        try await api.delete("/goals/\(goalId)")
    }

    static func completeGoal(_ goalId: String) async throws -> Goal {
        try await api.put("/goals/\(goalId)/complete", body: EmptyBody())
    }

    static func archiveGoal(_ goalId: String) async throws -> Goal {
        try await api.put("/goals/\(goalId)/archive", body: EmptyBody())
    }

    static func incrementStreak(_ goalId: String) async throws -> Goal {
        try await api.put("/goals/\(goalId)/streak", body: EmptyBody())
    }
}

/// Empty encodable body for PUT requests that don't need a payload.
struct EmptyBody: Encodable {}
