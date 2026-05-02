import SwiftUI

struct GoalFeedView: View {
    let goal: Goal
    @Environment(AuthViewModel.self) private var auth
    @Environment(ProfileViewModel.self) private var profileVM
    @Environment(FeedViewModel.self) private var feedVM
    @Environment(\.dismiss) private var dismiss

    @State private var posts: [Post] = []
    @State private var isLoading = true
    @State private var isProcessing = false

    // Alerts
    @State private var showArchiveConfirm = false
    @State private var showCompleteConfirm = false
    @State private var showDeleteConfirm = false
    @State private var showPaywall = false

    private var isSubscribed: Bool {
        auth.user?.isSubscribed == true
    }

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            ScrollView {
                VStack(spacing: 20) {
                    // Goal Header
                    VStack(spacing: 8) {
                        HStack(spacing: 4) {
                            Text("\(goal.streakCount)")
                                .font(.title2)
                                .fontWeight(.bold)
                                .foregroundStyle(goal.streakCount > 0 ? Color.brand : .white)
                            Text("🔥")
                                .font(.title2)
                        }

                        if let desc = goal.description, !desc.isEmpty {
                            Text(desc)
                                .font(.subheadline)
                                .foregroundStyle(.white.opacity(0.5))
                        }
                    }
                    .padding(.top, 20)

                    // Posts
                    if isLoading {
                        ProgressView()
                            .tint(.white)
                            .padding(.top, 40)
                    } else if posts.isEmpty {
                        VStack(spacing: 8) {
                            Text("No posts yet")
                                .font(.headline)
                                .foregroundStyle(.white.opacity(0.6))
                            Text("Post your first update for this goal!")
                                .font(.subheadline)
                                .foregroundStyle(.white.opacity(0.35))
                        }
                        .padding(.top, 40)
                    } else {
                        LazyVStack(spacing: 0) {
                            ForEach(posts) { post in
                                PostCardView(
                                    post: post,
                                    initialReaction: nil,
                                    currentUserId: auth.user?.id ?? "",
                                    onDelete: { postId in
                                        posts.removeAll { $0.id == postId }
                                    }
                                )
                            }
                        }
                        .padding(.horizontal, 16)
                    }
                }
                .padding(.bottom, 40)
            }
        }
        .navigationTitle(goal.title)
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(.black, for: .navigationBar)
        .toolbarBackground(.visible, for: .navigationBar)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    if isSubscribed {
                        Button {
                            showArchiveConfirm = true
                        } label: {
                            Label("Archive Goal", systemImage: "archivebox")
                        }
                    } else {
                        Button {
                            showCompleteConfirm = true
                        } label: {
                            Label("Complete Goal", systemImage: "checkmark.circle")
                        }
                    }

                    Button(role: .destructive) {
                        showDeleteConfirm = true
                    } label: {
                        Label("Delete Goal", systemImage: "trash")
                    }
                } label: {
                    Image(systemName: "ellipsis")
                        .foregroundStyle(.white)
                }
            }
        }
        // Subscriber: Archive goal
        .alert("Archive Goal", isPresented: $showArchiveConfirm) {
            Button("Archive") { archiveGoal() }
            Button("Cancel", role: .cancel) {}
        } message: {
            if posts.count > 0 {
                Text("Archive \"\(goal.title)\"? Your \(posts.count) post\(posts.count > 1 ? "s" : "") will be preserved in your Archived Goals section.")
            } else {
                Text("Archive \"\(goal.title)\"? It will move to your Archived Goals section.")
            }
        }
        // Free user: Complete goal with Streakd+ upsell
        .alert("Complete Goal", isPresented: $showCompleteConfirm) {
            Button("Learn About streakd+") { showPaywall = true }
            Button("Complete") { completeGoal() }
            Button("Cancel", role: .cancel) {}
        } message: {
            if posts.count > 0 {
                Text("Mark \"\(goal.title)\" as completed?\n\nYour \(posts.count) post\(posts.count > 1 ? "s" : "") will no longer appear on your profile.\n\nstreakd+ users can archive goals and keep all their posts forever.")
            } else {
                Text("Mark \"\(goal.title)\" as completed?\n\nUpgrade to streakd+ to archive goals and keep your posts forever.")
            }
        }
        // Delete goal
        .alert("Delete Goal?", isPresented: $showDeleteConfirm) {
            Button("Delete", role: .destructive) { deleteGoal() }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This will permanently delete this goal and all its posts. This cannot be undone.")
        }
        .navigationDestination(isPresented: $showPaywall) {
            PaywallView()
        }
        .task {
            await loadPosts()
        }
    }

    private func loadPosts() async {
        do {
            posts = try await PostService.getGoalPosts(goalId: goal.id)
        } catch {
            print("Error loading goal posts: \(error)")
        }
        isLoading = false
    }

    private func archiveGoal() {
        Task {
            isProcessing = true
            do {
                _ = try await GoalService.archiveGoal(goal.id)
                profileVM.markGoalArchived(goal.id)
                dismiss()
            } catch {
                print("Error archiving goal: \(error)")
            }
            isProcessing = false
        }
    }

    private func completeGoal() {
        Task {
            isProcessing = true
            do {
                _ = try await GoalService.completeGoal(goal.id)
                profileVM.markGoalCompleted(goal.id)
                feedVM.invalidate()
                dismiss()
            } catch {
                print("Error completing goal: \(error)")
            }
            isProcessing = false
        }
    }

    private func deleteGoal() {
        Task {
            do {
                try await GoalService.deleteGoal(goal.id)
                profileVM.removeGoal(goal.id)
                feedVM.invalidate()
                dismiss()
            } catch {
                print("Error deleting goal: \(error)")
            }
        }
    }
}
