import SwiftUI

struct SettingsView: View {
    @Environment(AuthViewModel.self) private var auth
    @State private var showDeleteConfirm = false
    @State private var showLogoutConfirm = false

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            ScrollView {
                VStack(spacing: 12) {
                    // Subscription
                    if auth.user?.isSubscribed != true {
                        NavigationLink {
                            PaywallView()
                        } label: {
                            settingsRow(icon: "star", title: "Upgrade to streakd+", color: Color.brand)
                        }
                    }

                    // Notification Settings
                    NavigationLink {
                        NotificationSettingsView()
                    } label: {
                        settingsRow(icon: "bell", title: "Notifications")
                    }

                    // Blocked Users
                    NavigationLink {
                        BlockedUsersView()
                    } label: {
                        settingsRow(icon: "nosign", title: "Blocked Users")
                    }

                    // Legal
                    NavigationLink {
                        // TODO: LegalTextView
                        Text("Privacy Policy").foregroundStyle(.white)
                    } label: {
                        settingsRow(icon: "doc.text", title: "Privacy Policy")
                    }

                    NavigationLink {
                        Text("Terms of Service").foregroundStyle(.white)
                    } label: {
                        settingsRow(icon: "doc.text", title: "Terms of Service")
                    }

                    Divider()
                        .background(Color.white.opacity(0.1))
                        .padding(.vertical, 8)

                    // Logout
                    Button {
                        showLogoutConfirm = true
                    } label: {
                        settingsRow(icon: "rectangle.portrait.and.arrow.right", title: "Log Out", color: .white)
                    }

                    // Delete Account
                    Button {
                        showDeleteConfirm = true
                    } label: {
                        settingsRow(icon: "trash", title: "Delete Account", color: .red)
                    }
                }
                .padding(16)
            }
        }
        .navigationTitle("Settings")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(.black, for: .navigationBar)
        .toolbarBackground(.visible, for: .navigationBar)
        .alert("Log Out?", isPresented: $showLogoutConfirm) {
            Button("Log Out", role: .destructive) { auth.signOut() }
            Button("Cancel", role: .cancel) {}
        }
        .alert("Delete Account?", isPresented: $showDeleteConfirm) {
            Button("Delete", role: .destructive) {
                Task { try? await auth.deleteAccount() }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This will permanently delete your account and all your data. This cannot be undone.")
        }
    }

    @ViewBuilder
    private func settingsRow(icon: String, title: String, color: Color = .white) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.body)
                .foregroundStyle(color.opacity(0.6))
                .frame(width: 24)

            Text(title)
                .font(.body)
                .foregroundStyle(color)

            Spacer()

            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundStyle(color.opacity(0.3))
        }
        .padding(16)
        .background(Color.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.cardBorder, lineWidth: 1))
    }
}
