import Foundation
import SwiftUI

@MainActor
@Observable
final class AuthViewModel {
    var user: User?
    var isLoading = true
    var isNewUser = false
    var needsVerification: Bool { user?.emailVerified == false }

    var isLoggedIn: Bool { user != nil }

    init() {
        Task { await restoreSession() }
    }

    // MARK: - Session

    func restoreSession() async {
        isLoading = true
        user = await AuthService.restoreSession()
        isLoading = false
    }

    // MARK: - Login

    func signIn(email: String, password: String) async throws {
        let u = try await AuthService.signIn(email: email, password: password)
        user = u
        isNewUser = false
    }

    // MARK: - Sign Up

    func signUp(email: String, password: String, username: String, name: String) async throws {
        let u = try await AuthService.signUp(email: email, password: password, username: username, name: name)
        user = u
        isNewUser = true
    }

    // MARK: - Sign Out

    func signOut() {
        AuthService.signOut()
        user = nil
        isNewUser = false
    }

    // MARK: - Refresh Profile

    func refreshProfile() async {
        guard let _ = user else { return }
        if let updated = try? await AuthService.getCurrentUser() {
            user = updated
        }
    }

    // MARK: - Email Verification

    func verifyEmail(code: String) async throws {
        try await AuthService.verifyEmail(code: code)
        await refreshProfile()
    }

    func resendVerification() async throws {
        try await AuthService.resendVerification()
    }

    // MARK: - Onboarding

    func completeOnboarding() {
        isNewUser = false
    }

    // MARK: - Delete Account

    func deleteAccount() async throws {
        try await AuthService.deleteAccount()
        user = nil
    }
}
