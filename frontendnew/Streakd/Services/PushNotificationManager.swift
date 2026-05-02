import Foundation
import UIKit
import UserNotifications

/// Manages APNs registration and token upload to the backend.
///
/// Usage:
/// 1. Call `requestPermission()` to prompt the user
/// 2. Set up the AppDelegate to forward the device token via `didRegisterForRemoteNotifications`
/// 3. The manager uploads the hex token to the backend automatically
@MainActor
final class PushNotificationManager: NSObject, ObservableObject {
    static let shared = PushNotificationManager()

    @Published var isAuthorized = false
    @Published var deviceToken: String?

    private var lastRegisteredToken: String?

    private override init() {
        super.init()
    }

    /// Request notification permissions and register for remote notifications.
    func requestPermission() async -> Bool {
        let center = UNUserNotificationCenter.current()

        do {
            let granted = try await center.requestAuthorization(options: [.alert, .badge, .sound])
            isAuthorized = granted

            if granted {
                UIApplication.shared.registerForRemoteNotifications()
            }

            return granted
        } catch {
            print("Push notification permission error: \(error)")
            return false
        }
    }

    /// Check current authorization status without prompting.
    func checkCurrentStatus() async {
        let settings = await UNUserNotificationCenter.current().notificationSettings()
        isAuthorized = settings.authorizationStatus == .authorized

        if isAuthorized {
            UIApplication.shared.registerForRemoteNotifications()
        }
    }

    /// Called from AppDelegate when APNs registration succeeds.
    /// Converts the raw device token data to a hex string and uploads to backend.
    func didRegisterForRemoteNotifications(deviceToken data: Data) {
        let token = data.map { String(format: "%02x", $0) }.joined()
        self.deviceToken = token

        // Only upload if token changed (avoids spamming the backend)
        guard token != lastRegisteredToken else { return }

        Task {
            do {
                try await UserService.updatePushToken(token)
                lastRegisteredToken = token
                print("Push token registered: \(token.prefix(16))...")
            } catch {
                print("Failed to upload push token: \(error)")
            }
        }
    }

    /// Called from AppDelegate when APNs registration fails.
    func didFailToRegisterForRemoteNotifications(error: Error) {
        print("APNs registration failed: \(error)")
    }
}
