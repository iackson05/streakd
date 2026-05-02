import SwiftUI

struct FeedView: View {
    @Environment(AuthViewModel.self) private var auth
    @Environment(FeedViewModel.self) private var feedVM
    @State private var showGoalSelector = false
    @State private var goals: [Goal] = []
    @State private var loadingGoals = false
    @State private var selectedGoalForPost: Goal?
    @State private var showNoGoalsAlert = false

    var body: some View {
        NavigationStack {
            ZStack {
                Color.black.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 0) {
                        // Feed Title
                        VStack(spacing: 8) {
                            Text("Your Feed")
                                .font(.title2)
                                .fontWeight(.semibold)
                                .foregroundStyle(.white.opacity(0.9))

                            Text("See what your friends are working on")
                                .font(.subheadline)
                                .foregroundStyle(.white.opacity(0.4))
                        }
                        .padding(.top, 16)
                        .padding(.bottom, 32)

                        if feedVM.isLoading {
                            ProgressView()
                                .tint(.white)
                                .padding(.top, 60)
                        } else if feedVM.posts.isEmpty {
                            emptyState
                        } else {
                            LazyVStack(spacing: 0) {
                                ForEach(feedVM.posts) { post in
                                    PostCardView(
                                        post: post,
                                        initialReaction: feedVM.userReactions[post.id],
                                        currentUserId: auth.user?.id ?? "",
                                        onDelete: { postId in
                                            feedVM.removePost(postId)
                                        }
                                    )
                                }
                            }
                            .padding(.horizontal, 16)

                            // End of feed
                            VStack(spacing: 16) {
                                Circle()
                                    .fill(Color.white.opacity(0.05))
                                    .frame(width: 48, height: 48)
                                    .overlay(
                                        Circle()
                                            .fill(Color.white.opacity(0.3))
                                            .frame(width: 8, height: 8)
                                    )
                                    .overlay(
                                        Circle()
                                            .stroke(Color.cardBorder, lineWidth: 1)
                                    )

                                Text("You're all caught up")
                                    .font(.subheadline)
                                    .foregroundStyle(.white.opacity(0.3))
                            }
                            .padding(.top, 32)
                            .padding(.bottom, 48)
                        }
                    }
                }
                .refreshable {
                    await feedVM.refresh()
                }
            }
            .toolbar(.hidden, for: .navigationBar)
            .safeAreaInset(edge: .top) {
                HStack {
                    Button {
                        // Logo tap
                    } label: {
                        Image("streakdLogo")
                            .resizable()
                            .renderingMode(.original)
                            .scaledToFit()
                            .frame(width: 80, height: 32)
                    }
                    .buttonStyle(.plain)

                    Spacer()

                    HStack(spacing: 12) {
                        Button {
                            loadGoalsAndShowSelector()
                        } label: {
                            if loadingGoals {
                                ProgressView().tint(.white.opacity(0.7))
                            } else {
                                Image(systemName: "plus")
                                    .foregroundStyle(.white.opacity(0.7))
                            }
                        }
                        .buttonStyle(HeaderButtonStyle())

                        NavigationLink {
                            FriendsView()
                        } label: {
                            Image(systemName: "person.2")
                                .foregroundStyle(.white.opacity(0.7))
                        }
                        .buttonStyle(HeaderButtonStyle())

                        NavigationLink {
                            ProfileView()
                        } label: {
                            AsyncImage(url: URL(string: auth.user?.profilePictureUrl ?? "")) { image in
                                image.resizable().scaledToFill()
                            } placeholder: {
                                Image(systemName: "person.crop.circle.fill")
                                    .foregroundStyle(.white.opacity(0.4))
                            }
                            .frame(width: 32, height: 32)
                            .clipShape(Circle())
                            .overlay(Circle().stroke(Color.white.opacity(0.2), lineWidth: 1.5))
                        }
                        .buttonStyle(HeaderButtonStyle())
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .background(Color.black)
            }
            .sheet(isPresented: $showGoalSelector) {
                GoalSelectorSheet(goals: goals) { goal in
                    showGoalSelector = false
                    selectedGoalForPost = goal
                }
            }
            .navigationDestination(item: $selectedGoalForPost) { goal in
                CreatePostView(goalId: goal.id)
            }
            .alert("No Goals", isPresented: $showNoGoalsAlert) {
                Button("OK") {}
            } message: {
                Text("You need to create a goal before posting.")
            }
        }
        .task {
            await feedVM.loadPosts()
        }
    }

    private var emptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: "flame")
                .font(.system(size: 64))
                .foregroundStyle(Color.brand)

            Text("Your feed is quiet")
                .font(.title3)
                .fontWeight(.bold)
                .foregroundStyle(.white.opacity(0.7))

            Text("Add friends and post your first streak update to get things going")
                .font(.subheadline)
                .foregroundStyle(.white.opacity(0.35))
                .multilineTextAlignment(.center)
                .padding(.horizontal, 24)

            NavigationLink {
                AddFriendsView()
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: "person.2")
                        .font(.caption)
                    Text("Find friends")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                }
                .foregroundStyle(Color.brand)
                .padding(.vertical, 12)
                .padding(.horizontal, 20)
                .background(Color.brand.opacity(0.1))
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color.brand.opacity(0.4), lineWidth: 1)
                )
            }
            .padding(.top, 8)
        }
        .padding(.vertical, 56)
    }

    private func loadGoalsAndShowSelector() {
        loadingGoals = true
        Task {
            do {
                goals = try await GoalService.getActiveGoals()
                if goals.isEmpty {
                    showNoGoalsAlert = true
                } else {
                    showGoalSelector = true
                }
            } catch {
                print("Error loading goals: \(error)")
            }
            loadingGoals = false
        }
    }
}

// MARK: - Goal Selector Sheet

struct GoalSelectorSheet: View {
    let goals: [Goal]
    let onSelect: (Goal) -> Void

    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ZStack {
                Color.black.ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 12) {
                        ForEach(goals) { goal in
                            Button {
                                onSelect(goal)
                                dismiss()
                            } label: {
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(goal.title)
                                        .font(.body)
                                        .fontWeight(.semibold)
                                        .foregroundStyle(.white)

                                    if let desc = goal.description, !desc.isEmpty {
                                        Text(desc)
                                            .font(.subheadline)
                                            .foregroundStyle(.white.opacity(0.6))
                                    }
                                }
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(16)
                                .background(Color.cardBackground)
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 12)
                                        .stroke(Color.cardBorder, lineWidth: 1)
                                )
                            }
                        }
                    }
                    .padding(16)
                }
            }
            .navigationTitle("Select Goal")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { dismiss() } label: {
                        Image(systemName: "xmark")
                            .foregroundStyle(.white)
                    }
                }
            }
            .toolbarBackground(.black, for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
    }
}

// MARK: - Header Button Style

struct HeaderButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .frame(width: 36, height: 36)
            .background(Color.white.opacity(0.05))
            .clipShape(Circle())
            .overlay(Circle().stroke(Color.white.opacity(0.1), lineWidth: 1))
            .opacity(configuration.isPressed ? 0.6 : 1.0)
    }
}
