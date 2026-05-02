import SwiftUI

struct NotificationSettingsView: View {
    @State private var settings = NotificationSettings(friendRequests: true, reactions: true, streakReminders: true)
    @State private var isLoading = true
    /// Gate the save handlers until the initial load finishes — otherwise the
    /// onChange observers fire when loaded values overwrite defaults and
    /// trigger spurious round-trips back to the server.
    @State private var isLoaded = false

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            if isLoading {
                ProgressView().tint(.white)
            } else {
                VStack(spacing: 12) {
                    toggleRow(title: "Friend Requests", isOn: $settings.friendRequests)
                    toggleRow(title: "Reactions", isOn: $settings.reactions)
                    toggleRow(title: "Streak Reminders", isOn: $settings.streakReminders)
                    Spacer()
                }
                .padding(16)
            }
        }
        .navigationTitle("Notifications")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(.black, for: .navigationBar)
        .toolbarBackground(.visible, for: .navigationBar)
        .task { await loadSettings() }
        .onChange(of: settings.friendRequests) { _, _ in if isLoaded { saveSettings() } }
        .onChange(of: settings.reactions) { _, _ in if isLoaded { saveSettings() } }
        .onChange(of: settings.streakReminders) { _, _ in if isLoaded { saveSettings() } }
    }

    @ViewBuilder
    private func toggleRow(title: String, isOn: Binding<Bool>) -> some View {
        HStack {
            Text(title)
                .foregroundStyle(.white)
            Spacer()
            Toggle("", isOn: isOn)
                .tint(Color.brand)
                .labelsHidden()
        }
        .padding(16)
        .background(Color.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.cardBorder, lineWidth: 1))
    }

    private func loadSettings() async {
        do {
            settings = try await UserService.getNotificationSettings()
        } catch {
            print("Error loading settings: \(error)")
        }
        isLoading = false
        isLoaded = true
    }

    private func saveSettings() {
        Task {
            try? await UserService.updateNotificationSettings(settings)
        }
    }
}
