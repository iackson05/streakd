import SwiftUI

/// Root view — shows auth screens or main app based on login state.
struct ContentView: View {
    @Environment(AuthViewModel.self) private var auth

    var body: some View {
        Group {
            if auth.isLoading {
                ZStack {
                    Color.black.ignoresSafeArea()
                    VStack(spacing: 16) {
                        Image("streakdLogo")
                            .resizable()
                            .scaledToFit()
                            .frame(width: 120, height: 120)
                        ProgressView()
                            .tint(.white)
                    }
                }
            } else if auth.isLoggedIn {
                if auth.needsVerification {
                    EmailVerificationView()
                } else if auth.isNewUser {
                    OnboardingView()
                } else {
                    FeedView()
                }
            } else {
                NavigationStack {
                    LoginView()
                }
            }
        }
        .preferredColorScheme(.dark)
    }
}
