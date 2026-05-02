import SwiftUI
import PhotosUI

struct OnboardingView: View {
    @Environment(AuthViewModel.self) private var auth
    @State private var step = 0 // 0=welcome, 1=goal, 2=friends, 3=photo, 4=notifications

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            VStack(spacing: 0) {
                // Progress header (steps 1-4)
                if step > 0 {
                    HStack {
                        Button {
                            withAnimation { step -= 1 }
                        } label: {
                            Image(systemName: "arrow.left")
                                .foregroundStyle(.white.opacity(0.6))
                                .frame(width: 40, height: 40)
                                .background(Color.white.opacity(0.05))
                                .clipShape(Circle())
                                .overlay(Circle().stroke(Color.white.opacity(0.1), lineWidth: 1))
                        }

                        Spacer()

                        // Progress dots
                        HStack(spacing: 8) {
                            ForEach(1...4, id: \.self) { i in
                                RoundedRectangle(cornerRadius: 4)
                                    .fill(step >= i ? Color.brand : Color.white.opacity(0.15))
                                    .frame(width: step >= i ? 24 : 8, height: 8)
                                    .animation(.easeInOut, value: step)
                            }
                        }

                        Spacer()

                        Button("Skip") {
                            withAnimation {
                                if step < 4 { step += 1 }
                                else { finishOnboarding() }
                            }
                        }
                        .font(.subheadline)
                        .foregroundStyle(.white.opacity(0.8))
                        .frame(width: 40)
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                }

                // Step content — frame fills remaining space so header stays fixed
                Group {
                    switch step {
                    case 0: welcomeStep
                    case 1: goalStep
                    case 2: friendsStep
                    case 3: photoStep
                    case 4: notificationsStep
                    default: EmptyView()
                    }
                }
                .frame(maxHeight: .infinity, alignment: .top)
                .padding(.horizontal, 24)
            }
        }
    }

    // MARK: - Step 0: Welcome

    private var welcomeStep: some View {
        VStack(spacing: 20) {
            Spacer()

            Image("streakdLogo")
                .resizable()
                .scaledToFit()
                .frame(width: 120, height: 120)

            Text("Welcome")
                .font(.largeTitle)
                .fontWeight(.bold)
                .foregroundStyle(.white)

            Text("Build habits that stick.\nStay accountable. Celebrate your wins.")
                .font(.body)
                .foregroundStyle(.white.opacity(0.5))
                .multilineTextAlignment(.center)
                .lineSpacing(4)

            Button {
                withAnimation { step = 1 }
            } label: {
                HStack(spacing: 8) {
                    Text("Get started")
                        .fontWeight(.bold)
                    Image(systemName: "chevron.right")
                        .font(.caption)
                }
            }
            .buttonStyle(BrandButtonStyle())
            .padding(.top, 8)

            Button("Skip setup") {
                finishOnboarding()
            }
            .font(.subheadline)
            .foregroundStyle(.white)

            Spacer()
        }
    }

    // MARK: - Step 1: Create Goal

    @State private var goalTitle = ""
    @State private var goalDescription = ""
    @State private var streakInterval: Double = 1
    @State private var goalPrivacy = "friends"
    @State private var goalLoading = false

    private var goalStep: some View {
        ScrollView {
            VStack(spacing: 20) {
                Text("Set your first goal")
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundStyle(.white)

                Text("What habit do you want to build?")
                    .font(.subheadline)
                    .foregroundStyle(.white.opacity(0.5))

                VStack(alignment: .leading, spacing: 8) {
                    Text("Goal title")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundStyle(.white.opacity(0.6))
                    TextField("e.g. Run 3x a week, Read daily...", text: $goalTitle)
                        .textFieldStyle(StreakdTextFieldStyle())
                        .textInputAutocapitalization(.never)
                }

                VStack(alignment: .leading, spacing: 8) {
                    HStack(spacing: 4) {
                        Text("Description")
                            .font(.caption).fontWeight(.semibold).foregroundStyle(.white.opacity(0.6))
                        Text("(optional)")
                            .font(.caption).foregroundStyle(.white.opacity(0.3))
                    }
                    TextField("What are you working towards?", text: $goalDescription, axis: .vertical)
                        .textFieldStyle(StreakdTextFieldStyle())
                        .textInputAutocapitalization(.never)
                        .lineLimit(3...5)
                }

                // Frequency
                VStack(spacing: 8) {
                    Text("Post frequency")
                        .font(.caption).fontWeight(.semibold).foregroundStyle(.white.opacity(0.6))
                        .frame(maxWidth: .infinity, alignment: .leading)
                    Text(streakText)
                        .font(.body).fontWeight(.semibold).foregroundStyle(.white)
                    Slider(value: $streakInterval, in: 1...7, step: 1).tint(Color.brand)
                    HStack {
                        Text("Every day").font(.caption2).foregroundStyle(.white.opacity(0.35))
                        Spacer()
                        Text("Once a week").font(.caption2).foregroundStyle(.white.opacity(0.35))
                    }
                }

                // Privacy
                VStack(alignment: .leading, spacing: 8) {
                    Text("Visibility")
                        .font(.caption).fontWeight(.semibold).foregroundStyle(.white.opacity(0.6))
                    HStack(spacing: 10) {
                        privacyChip("friends", "Friends", "Friends can see this")
                        privacyChip("private", "Private", "Just you")
                    }
                }

                Button {
                    Task { await createOnboardingGoal() }
                } label: {
                    if goalLoading {
                        ProgressView().tint(.white)
                    } else {
                        HStack(spacing: 8) {
                            Text("Create goal").fontWeight(.bold)
                            Image(systemName: "chevron.right").font(.caption)
                        }
                    }
                }
                .buttonStyle(BrandButtonStyle())
                .disabled(goalTitle.trimmingCharacters(in: .whitespaces).isEmpty || goalLoading)
                .opacity(goalTitle.trimmingCharacters(in: .whitespaces).isEmpty ? 0.35 : 1)
            }
            .padding(.top, 16)
            .padding(.bottom, 32)
        }
    }

    // MARK: - Step 2: Find Friends

    @State private var searchQuery = ""
    @State private var searchResults: [UserSearchResult] = []
    @State private var addedFriends: Set<String> = []
    @State private var isSearching = false
    @State private var searchDebounce: Task<Void, Never>?

    private var friendsStep: some View {
        VStack(spacing: 20) {
            Spacer().frame(height: 8)

            Text("👥")
                .font(.system(size: 48))
            Text("Find your people")
                .font(.title2).fontWeight(.bold).foregroundStyle(.white)
            Text("Accountability is better together")
                .font(.subheadline).foregroundStyle(.white.opacity(0.5))

            // Search bar
            HStack(spacing: 10) {
                Image(systemName: "magnifyingglass").foregroundStyle(.white.opacity(0.4))
                TextField("Search by username...", text: $searchQuery)
                    .foregroundStyle(.white)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .onChange(of: searchQuery) { _, newValue in
                        searchDebounce?.cancel()
                        searchDebounce = Task {
                            try? await Task.sleep(for: .milliseconds(300))
                            guard !Task.isCancelled else { return }
                            await searchFriends(newValue)
                        }
                    }
                if isSearching {
                    ProgressView().tint(Color.brand)
                }
            }
            .padding(14)
            .background(Color.cardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.cardBorder, lineWidth: 1))

            // Results
            ScrollView {
                LazyVStack(spacing: 0) {
                    ForEach(searchResults) { u in
                        HStack(spacing: 12) {
                            AsyncImage(url: URL(string: u.profilePictureUrl ?? "")) { image in
                                image.resizable().scaledToFill()
                            } placeholder: {
                                Circle().fill(Color.white.opacity(0.1))
                            }
                            .frame(width: 38, height: 38)
                            .clipShape(Circle())

                            VStack(alignment: .leading, spacing: 2) {
                                if let name = u.name, !name.isEmpty {
                                    Text(name).font(.subheadline).fontWeight(.semibold).foregroundStyle(.white)
                                }
                                Text("@\(u.username)")
                                    .font(.caption)
                                    .foregroundStyle(u.name != nil ? .white.opacity(0.4) : .white.opacity(0.85))
                            }

                            Spacer()

                            Button {
                                toggleFriend(u.id)
                            } label: {
                                if addedFriends.contains(u.id) {
                                    Image(systemName: "xmark")
                                        .font(.caption2)
                                        .foregroundStyle(Color.brand)
                                        .frame(width: 36, height: 36)
                                        .background(Color.brand.opacity(0.15))
                                        .clipShape(Circle())
                                        .overlay(Circle().stroke(Color.brand.opacity(0.4), lineWidth: 1))
                                } else {
                                    Image(systemName: "person.badge.plus")
                                        .font(.caption2)
                                        .foregroundStyle(.white)
                                        .frame(width: 36, height: 36)
                                        .background(Color.brand)
                                        .clipShape(Circle())
                                }
                            }
                        }
                        .padding(.vertical, 10)

                        Divider().background(Color.white.opacity(0.05))
                    }

                    if searchQuery.count >= 2 && searchResults.isEmpty && !isSearching {
                        Text("No users found")
                            .font(.caption)
                            .foregroundStyle(.white.opacity(0.3))
                            .padding(.vertical, 20)
                    }
                }
            }
            .frame(maxHeight: 200)

            Button {
                withAnimation { step = 3 }
            } label: {
                HStack(spacing: 8) {
                    Text(addedFriends.isEmpty ? "Add a friend to continue" : "Continue — \(addedFriends.count) added")
                        .fontWeight(.bold)
                    if !addedFriends.isEmpty {
                        Image(systemName: "chevron.right").font(.caption)
                    }
                }
            }
            .buttonStyle(BrandButtonStyle())
            .opacity(addedFriends.isEmpty ? 0.4 : 1.0)
            .disabled(addedFriends.isEmpty)

            Spacer()
        }
    }

    // MARK: - Step 3: Profile Photo

    @State private var selectedPhotoItem: PhotosPickerItem?
    @State private var profileImage: UIImage?
    @State private var photoLoading = false

    private var photoStep: some View {
        VStack(spacing: 20) {
            Spacer()

            Text("Add a profile picture")
                .font(.title2).fontWeight(.bold).foregroundStyle(.white)
            Text("Put a face to your streaks")
                .font(.subheadline).foregroundStyle(.white.opacity(0.5))

            // Avatar picker
            PhotosPicker(selection: $selectedPhotoItem, matching: .images) {
                if let image = profileImage {
                    Image(uiImage: image)
                        .resizable()
                        .scaledToFill()
                        .frame(width: 140, height: 140)
                        .clipShape(Circle())
                        .overlay(Circle().stroke(Color.brand, lineWidth: 3))
                } else {
                    Circle()
                        .fill(Color.white.opacity(0.05))
                        .frame(width: 140, height: 140)
                        .overlay(
                            Circle().stroke(Color.white.opacity(0.12), style: StrokeStyle(lineWidth: 2, dash: [8]))
                        )
                        .overlay {
                            VStack(spacing: 8) {
                                Image(systemName: "camera.fill")
                                    .font(.title)
                                    .foregroundStyle(.white.opacity(0.4))
                                Text("Tap to choose photo")
                                    .font(.caption)
                                    .foregroundStyle(.white.opacity(0.3))
                            }
                        }
                }
            }
            .onChange(of: selectedPhotoItem) { _, newValue in
                loadProfilePhoto(newValue)
            }

            Button {
                Task { await uploadProfilePhoto() }
            } label: {
                if photoLoading {
                    ProgressView().tint(.white)
                } else {
                    HStack(spacing: 8) {
                        Text("Set profile picture").fontWeight(.bold)
                        if profileImage != nil {
                            Image(systemName: "chevron.right").font(.caption)
                        }
                    }
                }
            }
            .buttonStyle(BrandButtonStyle())
            .opacity(profileImage != nil ? 1.0 : 0.4)
            .disabled(profileImage == nil)

            Spacer()
        }
    }

    // MARK: - Step 4: Notifications

    private var notificationsStep: some View {
        VStack(spacing: 20) {
            Spacer()

            Circle()
                .fill(Color.brand.opacity(0.15))
                .frame(width: 100, height: 100)
                .overlay(
                    Circle().stroke(Color.brand.opacity(0.4), lineWidth: 1)
                )
                .overlay {
                    Image(systemName: "bell.fill")
                        .font(.title)
                        .foregroundStyle(Color.brand)
                }

            Text("Stay on track")
                .font(.title2).fontWeight(.bold).foregroundStyle(.white)

            Text("Get reminders when it's time to post\nand see when friends react to your progress")
                .font(.subheadline).foregroundStyle(.white.opacity(0.5))
                .multilineTextAlignment(.center)

            // Benefits list
            VStack(spacing: 12) {
                benefitRow("Streak reminders so you never miss a day")
                benefitRow("Friend request alerts")
                benefitRow("Reactions on your posts")
            }
            .padding(16)
            .background(Color.white.opacity(0.03))
            .clipShape(RoundedRectangle(cornerRadius: 14))

            Button {
                Task { await enableNotifications() }
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: "bell.fill").font(.caption)
                    Text("Enable notifications").fontWeight(.bold)
                }
            }
            .buttonStyle(BrandButtonStyle())

            Button("Not now") {
                finishOnboarding()
            }
            .font(.subheadline)
            .foregroundStyle(.white)

            Spacer()
        }
    }

    // MARK: - Helpers

    private var streakText: String {
        let days = Int(streakInterval)
        if days == 1 { return "Every day" }
        if days == 7 { return "Once a week" }
        return "Every \(days) days"
    }

    @ViewBuilder
    private func privacyChip(_ value: String, _ label: String, _ desc: String) -> some View {
        let isActive = goalPrivacy == value
        Button { goalPrivacy = value } label: {
            VStack(spacing: 3) {
                Text(label).font(.subheadline).fontWeight(.semibold)
                    .foregroundStyle(isActive ? Color.brand : .white.opacity(0.5))
                Text(desc).font(.caption2)
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

    @ViewBuilder
    private func benefitRow(_ text: String) -> some View {
        HStack(spacing: 12) {
            Circle()
                .fill(Color.brand)
                .frame(width: 8, height: 8)
            Text(text)
                .font(.subheadline)
                .foregroundStyle(.white.opacity(0.7))
            Spacer()
        }
    }

    // MARK: - Actions

    private func createOnboardingGoal() async {
        goalLoading = true
        do {
            _ = try await GoalService.createGoal(
                title: goalTitle,
                description: goalDescription.isEmpty ? nil : goalDescription,
                privacy: goalPrivacy,
                streakInterval: Int(streakInterval)
            )
            withAnimation { step = 2 }
        } catch {
            print("Goal creation error: \(error)")
        }
        goalLoading = false
    }

    private func searchFriends(_ query: String) async {
        guard query.count >= 2 else {
            searchResults = []
            return
        }
        isSearching = true
        searchResults = (try? await UserService.searchUsers(query: query)) ?? []
        isSearching = false
    }

    private func toggleFriend(_ userId: String) {
        // Optimistic toggle. Onboarding sends pending requests; toggling off
        // attempts to retract the request via removeFriend (which deletes the
        // friendship row regardless of status). On failure, leave the local
        // state as-is rather than silently desyncing.
        if addedFriends.contains(userId) {
            Task {
                do {
                    try await UserService.removeFriend(friendId: userId)
                    addedFriends.remove(userId)
                } catch {
                    print("Failed to retract friend request: \(error)")
                }
            }
        } else {
            Task {
                do {
                    try await UserService.sendFriendRequest(friendId: userId)
                    addedFriends.insert(userId)
                } catch {
                    print("Failed to send friend request: \(error)")
                }
            }
        }
    }

    private func loadProfilePhoto(_ item: PhotosPickerItem?) {
        guard let item else { return }
        Task {
            if let data = try? await item.loadTransferable(type: Data.self),
               let image = UIImage(data: data) {
                profileImage = image
            }
        }
    }

    private func uploadProfilePhoto() async {
        guard let image = profileImage,
              let data = image.jpegData(compressionQuality: 0.8) else { return }
        photoLoading = true
        _ = try? await UserService.uploadProfilePicture(imageData: data)
        await auth.refreshProfile()
        photoLoading = false
        withAnimation { step = 4 }
    }

    private func enableNotifications() async {
        // Request permission and register for APNs
        _ = await PushNotificationManager.shared.requestPermission()

        // Enable all notification types on the backend
        try? await UserService.updateNotificationSettings(
            NotificationSettings(friendRequests: true, reactions: true, streakReminders: true)
        )
        finishOnboarding()
    }

    private func finishOnboarding() {
        auth.completeOnboarding()
    }
}

// MARK: - Inactive Button Style

struct InactiveButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .frame(maxWidth: .infinity)
            .padding(.vertical, 17)
            .background(Color.white.opacity(0.06))
            .foregroundStyle(.white.opacity(0.35))
            .font(.body.weight(.bold))
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .stroke(Color.white.opacity(0.1), lineWidth: 1)
            )
    }
}
