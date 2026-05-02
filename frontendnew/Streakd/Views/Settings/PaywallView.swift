import SwiftUI

/// Paywall screen for streakd+ subscription.
/// NOTE: RevenueCat Swift SDK integration is needed here.
/// For now this is a UI scaffold — purchase logic needs RevenueCat SDK added via SPM.
struct PaywallView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL
    @State private var isPurchasing = false
    @State private var isRestoring = false

    private let features: [(icon: String, title: String, description: String)] = [
        ("infinity", "Unlimited Goals", "Create as many active goals as you want — no cap, ever."),
        ("archivebox", "Goal Archival", "Complete a goal and keep all your posts and memories forever. Free accounts delete everything."),
        ("bell.badge", "Early Access to New Features", "streakd+ subscribers get first access to everything we ship next."),
    ]

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            ScrollView {
                VStack(spacing: 0) {
                    // Hero
                    VStack(spacing: 16) {
                        Image("streakdPlusLogo")
                            .resizable()
                            .scaledToFit()
                            .frame(width: 160, height: 44)

                        Text("Level up your\naccountability")
                            .font(.largeTitle)
                            .fontWeight(.bold)
                            .foregroundStyle(.white)
                            .multilineTextAlignment(.center)
                            .lineSpacing(4)

                        Text("Unlock unlimited goals, goal archival, and more — for less than a coffee a month.")
                            .font(.body)
                            .foregroundStyle(.white.opacity(0.6))
                            .multilineTextAlignment(.center)
                    }
                    .padding(.top, 40)
                    .padding(.bottom, 32)
                    .padding(.horizontal, 24)

                    // Features
                    VStack(spacing: 20) {
                        ForEach(features, id: \.title) { feature in
                            HStack(alignment: .top, spacing: 16) {
                                Image(systemName: feature.icon)
                                    .font(.body.weight(.bold))
                                    .foregroundStyle(.white)
                                    .frame(width: 40, height: 40)
                                    .background(Color.white.opacity(0.1))
                                    .clipShape(Circle())
                                    .overlay(Circle().stroke(Color.white.opacity(0.15), lineWidth: 1))

                                VStack(alignment: .leading, spacing: 4) {
                                    Text(feature.title)
                                        .font(.subheadline).fontWeight(.semibold).foregroundStyle(.white)
                                    Text(feature.description)
                                        .font(.caption).foregroundStyle(.white.opacity(0.55))
                                        .lineSpacing(3)
                                }
                            }
                        }
                    }
                    .padding(.horizontal, 24)
                    .padding(.bottom, 32)

                    // Comparison table
                    VStack(spacing: 0) {
                        comparisonHeader
                        Divider().background(Color.white.opacity(0.07))
                        comparisonRow("Active Goals", free: "2 max", plus: "Unlimited", highlight: true)
                        comparisonRow("Goal Archival", free: "No", plus: "Yes", highlight: true)
                        comparisonRow("Post History", free: "Lost on delete", plus: "Preserved", highlight: true)
                        comparisonRow("Streak Tracking", free: "Yes", plus: "Yes", highlight: false)
                    }
                    .padding(16)
                    .background(Color(white: 0.04))
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                    .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color.cardBorder, lineWidth: 1))
                    .padding(.horizontal, 24)
                    .padding(.bottom, 32)

                    // Pricing + CTA
                    VStack(spacing: 12) {
                        Text("$3.99")
                            .font(.largeTitle).fontWeight(.bold).foregroundStyle(.white)
                        + Text(" / month")
                            .font(.body).foregroundStyle(.white.opacity(0.5))

                        Button {
                            handleSubscribe()
                        } label: {
                            if isPurchasing {
                                ProgressView().tint(.black)
                            } else {
                                Text("Subscribe to streakd+")
                                    .fontWeight(.bold)
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 16)
                        .background(.white)
                        .foregroundStyle(.black)
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                        .disabled(isPurchasing)

                        Button {
                            handleRestore()
                        } label: {
                            if isRestoring {
                                ProgressView().tint(.white.opacity(0.5))
                            } else {
                                Text("Restore Purchases")
                                    .font(.subheadline)
                                    .foregroundStyle(.white.opacity(0.4))
                            }
                        }
                        .disabled(isRestoring)

                        Text("streakd+ is $3.99/month. Payment will be charged to your Apple ID at confirmation of purchase. Subscription automatically renews at $3.99/month unless cancelled at least 24 hours before the end of the current period. Manage or cancel in your Apple ID Account Settings.")
                            .font(.caption2)
                            .foregroundStyle(.white.opacity(0.25))
                            .multilineTextAlignment(.center)
                            .lineSpacing(3)
                            .padding(.top, 8)

                        HStack(spacing: 8) {
                            Button("Terms of Service") {
                                openURL(URL(string: "https://streakd.social/terms.html")!)
                            }
                            Text("|").foregroundStyle(.white.opacity(0.2))
                            Button("Privacy Policy") {
                                openURL(URL(string: "https://streakd.social/privacy.html")!)
                            }
                        }
                        .font(.caption2)
                        .foregroundStyle(.white.opacity(0.35))
                    }
                    .padding(.horizontal, 24)
                    .padding(.bottom, 48)
                }
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(.black, for: .navigationBar)
        .toolbarBackground(.visible, for: .navigationBar)
    }

    // MARK: - Comparison Table

    private var comparisonHeader: some View {
        HStack {
            Text("Feature")
                .foregroundStyle(.white.opacity(0.6))
            Spacer()
            Text("Free")
                .foregroundStyle(.white.opacity(0.4))
                .frame(width: 90)
            Text("streakd+")
                .foregroundStyle(.white)
                .fontWeight(.bold)
                .frame(width: 90)
        }
        .font(.caption)
        .padding(.vertical, 10)
    }

    @ViewBuilder
    private func comparisonRow(_ label: String, free: String, plus: String, highlight: Bool) -> some View {
        HStack {
            Text(label)
                .font(.caption)
                .foregroundStyle(.white.opacity(0.6))
            Spacer()
            Text(free)
                .font(.caption)
                .foregroundStyle(.white.opacity(0.4))
                .frame(width: 90)
            Text(plus)
                .font(.caption)
                .foregroundStyle(highlight ? .white : .white.opacity(0.7))
                .fontWeight(highlight ? .semibold : .regular)
                .frame(width: 90)
        }
        .padding(.vertical, 10)
    }

    // MARK: - Actions (RevenueCat TODO)

    private func handleSubscribe() {
        // TODO: Integrate RevenueCat Swift SDK
        // 1. Add RevenueCat via SPM: https://github.com/RevenueCat/purchases-ios
        // 2. Configure with API key in StreakdApp.swift
        // 3. Fetch offerings, purchase monthly package
        isPurchasing = true
        Task {
            try? await Task.sleep(for: .seconds(1))
            isPurchasing = false
        }
    }

    private func handleRestore() {
        // TODO: RevenueCat restorePurchases()
        isRestoring = true
        Task {
            try? await Task.sleep(for: .seconds(1))
            isRestoring = false
        }
    }
}
