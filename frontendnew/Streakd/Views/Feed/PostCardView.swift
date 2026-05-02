import SwiftUI

struct PostCardView: View {
    let post: Post
    let initialReaction: String?
    let currentUserId: String
    var onUserTap: ((String, String) -> Void)?
    var onDelete: ((String) -> Void)?

    @State private var selectedReaction: String?
    @State private var reactionFire: Int
    @State private var reactionFist: Int
    @State private var reactionParty: Int
    @State private var reactionHeart: Int
    @State private var imageRetryId = 0

    private let reactions: [(emoji: String, key: String)] = [
        ("🔥", "🔥"),
        ("👊", "👊"),
        ("🎉", "🎉"),
        ("❤️", "❤️"),
    ]

    init(post: Post, initialReaction: String?, currentUserId: String,
         onUserTap: ((String, String) -> Void)? = nil,
         onDelete: ((String) -> Void)? = nil) {
        self.post = post
        self.initialReaction = initialReaction
        self.currentUserId = currentUserId
        self.onUserTap = onUserTap
        self.onDelete = onDelete
        _selectedReaction = State(initialValue: initialReaction)
        _reactionFire = State(initialValue: post.reactionFire)
        _reactionFist = State(initialValue: post.reactionFist)
        _reactionParty = State(initialValue: post.reactionParty)
        _reactionHeart = State(initialValue: post.reactionHeart)
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // User header
            HStack(spacing: 10) {
                AsyncImage(url: URL(string: post.profilePictureUrl ?? "")) { image in
                    image.resizable().scaledToFill()
                } placeholder: {
                    Circle().fill(Color.cardBackground)
                }
                .frame(width: 36, height: 36)
                .clipShape(Circle())
                .overlay(Circle().stroke(Color.white.opacity(0.2), lineWidth: 1.5))
                .onTapGesture {
                    onUserTap?(post.userId, post.username ?? "Unknown")
                }

                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 4) {
                        Text(post.username ?? "Unknown")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundStyle(.white)
                            .onTapGesture {
                                onUserTap?(post.userId, post.username ?? "Unknown")
                            }

                        if post.postUserIsSubscribed == true {
                            Image(systemName: "checkmark.seal.fill")
                                .font(.caption2)
                                .foregroundStyle(Color.brand)
                        }
                    }

                    HStack(spacing: 4) {
                        Text(post.goalTitle ?? "Goal")
                            .font(.caption)
                            .foregroundStyle(.white.opacity(0.5))

                        if let streak = post.streakCount, streak > 0 {
                            Text("🔥 \(streak)")
                                .font(.caption)
                                .foregroundStyle(Color.brand)
                        }
                    }
                }

                Spacer()

                Text(formatTimestamp(post.createdAt))
                    .font(.caption2)
                    .foregroundStyle(.white.opacity(0.3))
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)

            // Post image
            if let imageUrl = post.imageUrl, let url = URL(string: imageUrl) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .scaledToFill()
                            .frame(maxWidth: .infinity)
                            .frame(height: 350)
                            .contentShape(Rectangle())
                            .clipped()
                    case .failure:
                        Rectangle()
                            .fill(Color.cardBackground)
                            .frame(height: 350)
                            .overlay {
                                Image(systemName: "photo")
                                    .foregroundStyle(.white.opacity(0.3))
                                    .font(.largeTitle)
                            }
                            .onAppear {
                                if imageRetryId < 3 {
                                    Task {
                                        try? await Task.sleep(for: .seconds(2))
                                        imageRetryId += 1
                                    }
                                }
                            }
                    default:
                        Rectangle()
                            .fill(Color.cardBackground)
                            .frame(height: 350)
                            .overlay { ProgressView().tint(.white) }
                    }
                }
                .id(imageRetryId)
                .frame(maxWidth: .infinity)
                .frame(height: 350)
                .clipped()
            }

            // Reactions bar
            HStack(spacing: 12) {
                ForEach(reactions, id: \.key) { reaction in
                    Button {
                        toggleReaction(reaction.key)
                    } label: {
                        HStack(spacing: 4) {
                            Text(reaction.emoji)
                                .font(.system(size: 18))
                            Text("\(reactionCount(for: reaction.key))")
                                .font(.caption)
                                .foregroundStyle(
                                    selectedReaction == reaction.key
                                        ? Color.brand
                                        : .white.opacity(0.5)
                                )
                        }
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(
                            selectedReaction == reaction.key
                                ? Color.brand.opacity(0.15)
                                : Color.white.opacity(0.05)
                        )
                        .clipShape(Capsule())
                        .overlay(
                            Capsule().stroke(
                                selectedReaction == reaction.key
                                    ? Color.brand.opacity(0.3)
                                    : Color.white.opacity(0.1),
                                lineWidth: 1
                            )
                        )
                    }
                }

                Spacer()

                // Delete button (own posts only)
                if post.userId == currentUserId {
                    Button {
                        deletePost()
                    } label: {
                        Image(systemName: "trash")
                            .font(.caption)
                            .foregroundStyle(.white.opacity(0.3))
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
        }
        .background(Color.cardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color.cardBorder, lineWidth: 1)
        )
        .padding(.bottom, 16)
    }

    private func reactionCount(for emoji: String) -> Int {
        switch emoji {
        case "🔥": return reactionFire
        case "👊": return reactionFist
        case "🎉": return reactionParty
        case "❤️": return reactionHeart
        default: return 0
        }
    }

    private func toggleReaction(_ emoji: String) {
        let previous = selectedReaction

        // Optimistic update
        if selectedReaction == emoji {
            selectedReaction = nil
            adjustCount(emoji, by: -1)
        } else {
            if let prev = previous {
                adjustCount(prev, by: -1)
            }
            selectedReaction = emoji
            adjustCount(emoji, by: 1)
        }

        Task {
            do {
                try await PostService.toggleReaction(postId: post.id, emoji: emoji)
            } catch {
                // Revert on error
                selectedReaction = previous
                if previous == emoji {
                    adjustCount(emoji, by: 1)
                } else {
                    adjustCount(emoji, by: -1)
                    if let prev = previous {
                        adjustCount(prev, by: 1)
                    }
                }
            }
        }
    }

    private func adjustCount(_ emoji: String, by delta: Int) {
        switch emoji {
        case "🔥": reactionFire += delta
        case "👊": reactionFist += delta
        case "🎉": reactionParty += delta
        case "❤️": reactionHeart += delta
        default: break
        }
    }

    private func deletePost() {
        Task {
            do {
                try await PostService.deletePost(post.id)
                onDelete?(post.id)
            } catch {
                print("Error deleting post: \(error)")
            }
        }
    }
}
