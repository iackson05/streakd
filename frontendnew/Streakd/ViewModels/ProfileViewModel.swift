import Foundation
import SwiftUI

@MainActor
@Observable
final class ProfileViewModel {
    var goals: [Goal] = []
    var posts: [Post] = []
    var stats = ProfileStats()
    var isLoading = false

    private var lastFetch: Date?
    private let debounceInterval: TimeInterval = 30

    struct ProfileStats {
        var totalPosts = 0
        var goalsCompleted = 0
        var friendCount = 0
    }

    func loadProfile(userId: String, force: Bool = false) async {
        if !force, let last = lastFetch, Date().timeIntervalSince(last) < debounceInterval {
            return
        }

        isLoading = goals.isEmpty

        do {
            async let goalsResult = GoalService.getAllGoals()
            async let profileResult = UserService.getProfile(userId: userId)
            async let friendIdsResult = UserService.getAcceptedFriendIds()

            let (fetchedGoals, profile, friendIds) = try await (goalsResult, profileResult, friendIdsResult)

            goals = fetchedGoals
            stats.friendCount = friendIds.count
            stats.totalPosts = profile.postCount
            stats.goalsCompleted = profile.completedGoalsCount

            lastFetch = Date()
        } catch {
            print("Error loading profile: \(error)")
        }

        isLoading = false
    }

    func invalidate() {
        lastFetch = nil
    }

    // MARK: - Optimistic Updates

    func addGoal(_ goal: Goal) {
        goals.insert(goal, at: 0)
    }

    func removeGoal(_ goalId: String) {
        goals.removeAll { $0.id == goalId }
    }

    func markGoalCompleted(_ goalId: String) {
        if let index = goals.firstIndex(where: { $0.id == goalId }) {
            goals[index].completed = true
        }
    }

    func markGoalArchived(_ goalId: String) {
        if let index = goals.firstIndex(where: { $0.id == goalId }) {
            goals[index].completed = true
            goals[index].archived = true
        }
    }
}
