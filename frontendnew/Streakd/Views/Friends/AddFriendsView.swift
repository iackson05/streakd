import SwiftUI

struct AddFriendsView: View {
    @State private var searchQuery = ""
    @State private var searchResults: [UserSearchResult] = []
    @State private var isSearching = false
    @State private var sentRequests: Set<String> = []
    @State private var searchDebounce: Task<Void, Never>?

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            VStack(spacing: 0) {
                // Search Bar
                HStack(spacing: 10) {
                    Image(systemName: "magnifyingglass")
                        .foregroundStyle(.white.opacity(0.4))

                    TextField("Search by username", text: $searchQuery)
                        .foregroundStyle(.white)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .onChange(of: searchQuery) { _, newValue in
                            searchDebounce?.cancel()
                            searchDebounce = Task {
                                try? await Task.sleep(for: .milliseconds(300))
                                guard !Task.isCancelled else { return }
                                await search(newValue)
                            }
                        }
                }
                .padding(14)
                .background(Color.cardBackground)
                .clipShape(RoundedRectangle(cornerRadius: 14))
                .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color.cardBorder, lineWidth: 1))
                .padding(.horizontal, 16)
                .padding(.top, 12)

                // Results
                ScrollView {
                    LazyVStack(spacing: 8) {
                        ForEach(searchResults) { user in
                            HStack(spacing: 12) {
                                AsyncImage(url: URL(string: user.profilePictureUrl ?? "")) { image in
                                    image.resizable().scaledToFill()
                                } placeholder: {
                                    Circle().fill(Color.cardBackground)
                                }
                                .frame(width: 44, height: 44)
                                .clipShape(Circle())

                                VStack(alignment: .leading, spacing: 2) {
                                    Text(user.username)
                                        .font(.body)
                                        .fontWeight(.medium)
                                        .foregroundStyle(.white)

                                    if let name = user.name, !name.isEmpty {
                                        Text(name)
                                            .font(.caption)
                                            .foregroundStyle(.white.opacity(0.5))
                                    }
                                }

                                Spacer()

                                if sentRequests.contains(user.id) {
                                    Text("Sent")
                                        .font(.caption)
                                        .foregroundStyle(.white.opacity(0.4))
                                        .padding(.horizontal, 14)
                                        .padding(.vertical, 8)
                                        .background(Color.white.opacity(0.1))
                                        .clipShape(Capsule())
                                } else {
                                    Button {
                                        sendRequest(to: user.id)
                                    } label: {
                                        Text("Add")
                                            .font(.caption)
                                            .fontWeight(.semibold)
                                            .foregroundStyle(.white)
                                            .padding(.horizontal, 14)
                                            .padding(.vertical, 8)
                                            .background(Color.brand)
                                            .clipShape(Capsule())
                                    }
                                }
                            }
                            .padding(12)
                            .background(Color.cardBackground)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.cardBorder, lineWidth: 1))
                        }
                    }
                    .padding(16)
                }
            }
        }
        .navigationTitle("Add Friends")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(.black, for: .navigationBar)
        .toolbarBackground(.visible, for: .navigationBar)
    }

    private func search(_ query: String) async {
        guard query.count >= 2 else {
            searchResults = []
            return
        }

        isSearching = true
        do {
            searchResults = try await UserService.searchUsers(query: query)
        } catch {
            print("Search error: \(error)")
        }
        isSearching = false
    }

    private func sendRequest(to userId: String) {
        Task {
            do {
                try await UserService.sendFriendRequest(friendId: userId)
                sentRequests.insert(userId)
            } catch {
                print("Error sending friend request: \(error)")
            }
        }
    }
}
