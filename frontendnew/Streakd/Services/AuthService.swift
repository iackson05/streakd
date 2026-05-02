import Foundation

/// Handles login, signup, logout, and session restoration.
@MainActor
enum AuthService {
    private static var api: APIClient { APIClient.shared }

    static func signIn(email: String, password: String) async throws -> User {
        let body = LoginRequest(email: email, password: password)
        let bodyData = try JSONEncoder().encode(body)

        let (data, response) = try await api.fetch(path: "/auth/login", method: "POST", body: bodyData)

        guard response.statusCode == 200 else {
            let detail = parseDetail(data)
            throw APIError.httpError(statusCode: response.statusCode, detail: detail ?? "Invalid login credentials")
        }

        let tokens = try JSONDecoder().decode(AuthTokens.self, from: data)
        api.saveTokens(access: tokens.accessToken, refresh: tokens.refreshToken)

        // Fetch user profile
        return try await api.get("/auth/me")
    }

    static func signUp(email: String, password: String, username: String, name: String) async throws -> User {
        let body = SignUpRequest(email: email, password: password, username: username, name: name)
        let bodyData = try JSONEncoder().encode(body)

        let (data, response) = try await api.fetch(path: "/auth/signup", method: "POST", body: bodyData)

        guard (200...201).contains(response.statusCode) else {
            let detail = parseDetail(data)
            throw APIError.httpError(statusCode: response.statusCode, detail: detail ?? "Sign up failed")
        }

        let tokens = try JSONDecoder().decode(AuthTokens.self, from: data)
        api.saveTokens(access: tokens.accessToken, refresh: tokens.refreshToken)

        return try await api.get("/auth/me")
    }

    static func getCurrentUser() async throws -> User {
        try await api.get("/auth/me")
    }

    static func signOut() {
        api.clearTokens()
    }

    static func restoreSession() async -> User? {
        guard api.isLoggedIn else { return nil }
        return try? await getCurrentUser()
    }

    static func deleteAccount() async throws {
        try await api.delete("/users/me")
        api.clearTokens()
    }

    private static func parseDetail(_ data: Data) -> String? {
        if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
           let detail = json["detail"] as? String {
            return detail
        }
        return nil
    }
}
