import SwiftUI

struct ProfileView: View {
    @Environment(AuthViewModel.self) private var auth
    @Environment(ProfileViewModel.self) private var profileVM
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            ScrollView {
                VStack(spacing: 24) {
                    // Profile Header
                    VStack(spacing: 16) {
                        AsyncImage(url: URL(string: auth.user?.profilePictureUrl ?? "")) { image in
                            image.resizable().scaledToFill()
                        } placeholder: {
                            Circle().fill(Color.cardBackground)
                                .overlay {
                                    Image(systemName: "person.fill")
                                        .font(.largeTitle)
                                        .foregroundStyle(.white.opacity(0.3))
                                }
                        }
                        .frame(width: 80, height: 80)
                        .clipShape(Circle())
                        .overlay(Circle().stroke(Color.white.opacity(0.2), lineWidth: 2))

                        VStack(spacing: 4) {
                            HStack(spacing: 4) {
                                Text(auth.user?.username ?? "")
                                    .font(.title3)
                                    .fontWeight(.bold)
                                    .foregroundStyle(.white)

                                if auth.user?.isSubscribed == true {
                                    Image(systemName: "checkmark.seal.fill")
                                        .foregroundStyle(Color.brand)
                                }
                            }

                            if let name = auth.user?.name, !name.isEmpty {
                                Text(name)
                                    .font(.subheadline)
                                    .foregroundStyle(.white.opacity(0.5))
                            }
                        }
                    }
                    .padding(.top, 20)

                    // Stats
                    HStack(spacing: 0) {
                        statItem(value: "\(profileVM.stats.totalPosts)", label: "Posts")
                        statItem(value: "\(profileVM.stats.goalsCompleted)", label: "Completed")
                        statItem(value: "\(profileVM.stats.friendCount)", label: "Friends")
                    }
                    .padding(.vertical, 16)
                    .background(Color.cardBackground)
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                    .overlay(
                        RoundedRectangle(cornerRadius: 16)
                            .stroke(Color.cardBorder, lineWidth: 1)
                    )

                    // Goals Section
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Text("Your Goals")
                                .font(.headline)
                                .foregroundStyle(.white)
                            Spacer()
                            NavigationLink {
                                CreateGoalView()
                            } label: {
                                Image(systemName: "plus.circle")
                                    .foregroundStyle(Color.brand)
                            }
                        }

                        if profileVM.goals.isEmpty {
                            VStack(spacing: 12) {
                                NavigationLink {
                                    CreateGoalView()
                                } label: {
                                    Text("Create your first goal")
                                        .font(.subheadline)
                                        .fontWeight(.semibold)
                                        .foregroundStyle(Color.brand)
                                }
                            }
                            .padding(.vertical, 20)
                        } else {
                            ForEach(profileVM.goals.filter { !$0.completed }) { goal in
                                NavigationLink {
                                    GoalFeedView(goal: goal)
                                } label: {
                                    goalCard(goal)
                                }
                            }
                        }
                    }

                    // Action Buttons
                    VStack(spacing: 12) {
                        NavigationLink {
                            EditProfileView()
                        } label: {
                            actionRow(icon: "pencil", title: "Edit Profile")
                        }

                        NavigationLink {
                            SettingsView()
                        } label: {
                            actionRow(icon: "gearshape", title: "Settings")
                        }
                    }
                }
                .padding(.horizontal, 16)
                .padding(.bottom, 40)
            }
            .refreshable {
                if let userId = auth.user?.id {
                    await profileVM.loadProfile(userId: userId, force: true)
                }
            }
        }
        .navigationTitle("Profile")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(.black, for: .navigationBar)
        .toolbarBackground(.visible, for: .navigationBar)
        .task {
            if let userId = auth.user?.id {
                await profileVM.loadProfile(userId: userId)
            }
        }
    }

    @ViewBuilder
    private func statItem(value: String, label: String) -> some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.title2)
                .fontWeight(.bold)
                .foregroundStyle(.white)
            Text(label)
                .font(.caption)
                .foregroundStyle(.white.opacity(0.5))
        }
        .frame(maxWidth: .infinity)
    }

    @ViewBuilder
    private func goalCard(_ goal: Goal) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Text(goal.title)
                        .font(.body)
                        .fontWeight(.semibold)
                        .foregroundStyle(.white)

                    Image(systemName: goal.privacy == "private" ? "lock.fill" : "person.2.fill")
                        .font(.caption2)
                        .foregroundStyle(.white.opacity(0.35))
                }

                if let desc = goal.description, !desc.isEmpty {
                    Text(desc)
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.5))
                        .lineLimit(1)
                }
            }

            Spacer()

            if goal.streakCount > 0 {
                HStack(spacing: 2) {
                    Text("🔥")
                    Text("\(goal.streakCount)")
                        .fontWeight(.semibold)
                        .foregroundStyle(Color.brand)
                }
                .font(.subheadline)
            }

            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundStyle(.white.opacity(0.3))
        }
        .padding(16)
        .background(Color.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color.cardBorder, lineWidth: 1)
        )
    }

    @ViewBuilder
    private func actionRow(icon: String, title: String) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.body)
                .foregroundStyle(.white.opacity(0.6))
                .frame(width: 24)

            Text(title)
                .font(.body)
                .foregroundStyle(.white)

            Spacer()

            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundStyle(.white.opacity(0.3))
        }
        .padding(16)
        .background(Color.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color.cardBorder, lineWidth: 1)
        )
    }
}
