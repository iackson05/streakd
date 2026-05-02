import Foundation
import SwiftUI

/// Manages feed state — posts from friends in the last 24h.
@MainActor
@Observable
final class FeedViewModel {
    var posts: [Post] = []
    var userReactions: [String: String] = [:]
    var isLoading = false
    var isRefreshing = false
    var error: String?

    private var lastFetch: Date?
    private let debounceInterval: TimeInterval = 30

    func loadPosts(force: Bool = false) async {
        if !force, let last = lastFetch, Date().timeIntervalSince(last) < debounceInterval {
            return
        }

        isLoading = posts.isEmpty
        error = nil

        do {
            let feedPosts = try await PostService.getFeedPosts()

            // Batch fetch reactions
            if !feedPosts.isEmpty {
                let postIds = feedPosts.map(\.id)
                userReactions = try await PostService.getUserReactions(postIds: postIds)
            }

            posts = feedPosts
            lastFetch = Date()
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
        isRefreshing = false
    }

    func refresh() async {
        isRefreshing = true
        await loadPosts(force: true)
    }

    func removePost(_ postId: String) {
        posts.removeAll { $0.id == postId }
    }

    func addPost(_ post: Post) {
        posts.insert(post, at: 0)
    }

    func invalidate() {
        lastFetch = nil
    }
}
