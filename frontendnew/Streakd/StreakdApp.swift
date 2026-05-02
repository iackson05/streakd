import SwiftUI

@main
struct StreakdApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate

    @State private var authVM = AuthViewModel()
    @State private var feedVM = FeedViewModel()
    @State private var profileVM = ProfileViewModel()
    @State private var friendsVM = FriendsViewModel()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(authVM)
                .environment(feedVM)
                .environment(profileVM)
                .environment(friendsVM)
                .task {
                    // Check push notification status on app launch
                    await PushNotificationManager.shared.checkCurrentStatus()
                }
        }
    }
}
