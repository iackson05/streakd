import SwiftUI

struct CreateGoalView: View {
    @Environment(AuthViewModel.self) private var auth
    @Environment(ProfileViewModel.self) private var profileVM
    @Environment(\.dismiss) private var dismiss

    @State private var title = ""
    @State private var description = ""
    @State private var streakInterval: Double = 1
    @State private var privacy = "friends"
    @State private var isLoading = false
    @State private var errorMessage: String?
    @State private var showPaywall = false

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            ScrollView {
                VStack(spacing: 20) {
                    // Title
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Goal title")
                            .font(.caption)
                            .fontWeight(.semibold)
                            .foregroundStyle(.white.opacity(0.6))

                        TextField("e.g. Run 3x a week, Read daily...", text: $title)
                            .textFieldStyle(StreakdTextFieldStyle())
                            .textInputAutocapitalization(.never)
                    }

                    // Description
                    VStack(alignment: .leading, spacing: 8) {
                        HStack(spacing: 4) {
                            Text("Description")
                                .font(.caption)
                                .fontWeight(.semibold)
                                .foregroundStyle(.white.opacity(0.6))
                            Text("(optional)")
                                .font(.caption)
                                .foregroundStyle(.white.opacity(0.3))
                        }

                        TextField("What are you working towards?", text: $description, axis: .vertical)
                            .textFieldStyle(StreakdTextFieldStyle())
                            .textInputAutocapitalization(.never)
                            .lineLimit(3...6)
                    }

                    // Post Frequency
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Post frequency")
                            .font(.caption)
                            .fontWeight(.semibold)
                            .foregroundStyle(.white.opacity(0.6))

                        Text(streakText)
                            .font(.body)
                            .fontWeight(.semibold)
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)

                        Slider(value: $streakInterval, in: 1...7, step: 1)
                            .tint(Color.brand)

                        HStack {
                            Text("Every day")
                                .font(.caption2)
                                .foregroundStyle(.white.opacity(0.35))
                            Spacer()
                            Text("Once a week")
                                .font(.caption2)
                                .foregroundStyle(.white.opacity(0.35))
                        }
                    }

                    // Privacy
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Visibility")
                            .font(.caption)
                            .fontWeight(.semibold)
                            .foregroundStyle(.white.opacity(0.6))

                        HStack(spacing: 10) {
                            privacyChip(value: "friends", label: "Friends", desc: "Friends can see this")
                            privacyChip(value: "private", label: "Private", desc: "Just you")
                        }
                    }

                    // Error
                    if let errorMessage {
                        Text(errorMessage)
                            .font(.caption)
                            .foregroundStyle(.red)
                    }

                    // Create Button
                    Button {
                        Task { await createGoal() }
                    } label: {
                        if isLoading {
                            ProgressView().tint(.white)
                        } else {
                            HStack(spacing: 8) {
                                Text("Create goal")
                                    .fontWeight(.bold)
                                Image(systemName: "chevron.right")
                                    .font(.caption)
                            }
                        }
                    }
                    .buttonStyle(BrandButtonStyle())
                    .disabled(title.trimmingCharacters(in: .whitespaces).isEmpty || isLoading)
                    .opacity(title.trimmingCharacters(in: .whitespaces).isEmpty ? 0.5 : 1)
                }
                .padding(24)
            }
        }
        .navigationTitle("New Goal")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(.black, for: .navigationBar)
        .toolbarBackground(.visible, for: .navigationBar)
        .navigationDestination(isPresented: $showPaywall) {
            PaywallView()
        }
    }

    private var streakText: String {
        let days = Int(streakInterval)
        if days == 1 { return "Every day" }
        if days == 7 { return "Once a week" }
        return "Every \(days) days"
    }

    @ViewBuilder
    private func privacyChip(value: String, label: String, desc: String) -> some View {
        let isActive = privacy == value
        Button {
            privacy = value
        } label: {
            VStack(spacing: 3) {
                Text(label)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .foregroundStyle(isActive ? Color.brand : .white.opacity(0.5))

                Text(desc)
                    .font(.caption2)
                    .foregroundStyle(isActive ? Color.brand.opacity(0.6) : .white.opacity(0.25))
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .background(isActive ? Color.brand.opacity(0.15) : Color.white.opacity(0.05))
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(isActive ? Color.brand.opacity(0.4) : Color.white.opacity(0.1), lineWidth: 1)
            )
        }
    }

    private func createGoal() async {
        let activeGoals = profileVM.goals.filter { !$0.completed && !$0.archived }
        if activeGoals.count >= 2 && auth.user?.isSubscribed != true {
            showPaywall = true
            return
        }

        isLoading = true
        errorMessage = nil

        do {
            let goal = try await GoalService.createGoal(
                title: title,
                description: description.isEmpty ? nil : description,
                privacy: privacy,
                streakInterval: Int(streakInterval)
            )
            profileVM.addGoal(goal)
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }
}
