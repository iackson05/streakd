import Foundation

/// Errors from the API layer.
enum APIError: LocalizedError {
    case invalidURL
    case httpError(statusCode: Int, detail: String?)
    case decodingError(Error)
    case networkError(Error)
    case noRefreshToken
    case refreshFailed

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .httpError(let code, let detail):
            return detail ?? "Request failed (\(code))"
        case .decodingError(let error):
            return "Decoding error: \(error.localizedDescription)"
        case .networkError(let error):
            return error.localizedDescription
        case .noRefreshToken:
            return "No refresh token available"
        case .refreshFailed:
            return "Session expired. Please log in again."
        }
    }
}

/// JWT-authenticated HTTP client matching the React Native `api.js` behavior.
/// - Stores access + refresh tokens in Keychain
/// - Auto-refreshes on 401 and retries once
@MainActor
final class APIClient {
    static let shared = APIClient()

    private let baseURL = Config.apiBaseURL
    private let session = URLSession.shared
    private let decoder: JSONDecoder = {
        let d = JSONDecoder()
        return d
    }()

    private let accessTokenKey = "streakd_access_token"
    private let refreshTokenKey = "streakd_refresh_token"

    /// Shared in-flight refresh task — concurrent 401s wait on the same task
    /// instead of each kicking off their own refresh (which would cause one
    /// refresh to invalidate the other and force a logout).
    private var refreshTask: Task<Void, Error>?

    private init() {}

    // MARK: - Token Management

    var accessToken: String? {
        KeychainHelper.readString(for: accessTokenKey)
    }

    var refreshToken: String? {
        KeychainHelper.readString(for: refreshTokenKey)
    }

    var isLoggedIn: Bool {
        accessToken != nil
    }

    func saveTokens(access: String, refresh: String) {
        KeychainHelper.saveString(access, for: accessTokenKey)
        KeychainHelper.saveString(refresh, for: refreshTokenKey)
    }

    func clearTokens() {
        KeychainHelper.delete(for: accessTokenKey)
        KeychainHelper.delete(for: refreshTokenKey)
    }

    // MARK: - Core Request

    /// Authenticated fetch with auto-refresh on 401.
    func fetch(
        path: String,
        method: String = "GET",
        body: Data? = nil,
        contentType: String? = "application/json"
    ) async throws -> (Data, HTTPURLResponse) {
        let (data, response) = try await rawFetch(
            path: path, method: method, body: body, contentType: contentType
        )

        // If 401 and we have tokens, try refreshing
        if response.statusCode == 401, accessToken != nil {
            do {
                try await refreshAccessToken()
                return try await rawFetch(
                    path: path, method: method, body: body, contentType: contentType
                )
            } catch {
                // Refresh failed — caller handles 401
                throw APIError.refreshFailed
            }
        }

        return (data, response)
    }

    private func rawFetch(
        path: String,
        method: String,
        body: Data?,
        contentType: String?
    ) async throws -> (Data, HTTPURLResponse) {
        guard let url = URL(string: "\(baseURL)\(path)") else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method

        if let contentType {
            request.setValue(contentType, forHTTPHeaderField: "Content-Type")
        }

        if let token = accessToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        request.httpBody = body

        do {
            let (data, response) = try await session.data(for: request)
            guard let httpResponse = response as? HTTPURLResponse else {
                throw APIError.networkError(
                    NSError(domain: "APIClient", code: -1,
                            userInfo: [NSLocalizedDescriptionKey: "Invalid response"])
                )
            }
            return (data, httpResponse)
        } catch let error as APIError {
            throw error
        } catch {
            throw APIError.networkError(error)
        }
    }

    private func refreshAccessToken() async throws {
        // If a refresh is already in flight, wait on it instead of starting a new one.
        if let existing = refreshTask {
            try await existing.value
            return
        }

        let task = Task<Void, Error> { [weak self] in
            guard let self else { return }
            defer { self.refreshTask = nil }

            guard let refresh = self.refreshToken else {
                self.clearTokens()
                throw APIError.noRefreshToken
            }

            let body = try JSONEncoder().encode(RefreshRequest(refreshToken: refresh))

            guard let url = URL(string: "\(self.baseURL)/auth/refresh") else {
                throw APIError.invalidURL
            }

            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = body

            let (data, response) = try await self.session.data(for: request)
            guard let httpResponse = response as? HTTPURLResponse,
                  httpResponse.statusCode == 200 else {
                self.clearTokens()
                throw APIError.refreshFailed
            }

            let tokens = try self.decoder.decode(AuthTokens.self, from: data)
            self.saveTokens(access: tokens.accessToken, refresh: tokens.refreshToken)
        }
        refreshTask = task
        try await task.value
    }

    // MARK: - Convenience Methods

    /// GET request, returns decoded JSON.
    func get<T: Decodable>(_ path: String) async throws -> T {
        let (data, response) = try await fetch(path: path)

        guard response.statusCode == 200 else {
            let detail = parseErrorDetail(from: data)
            throw APIError.httpError(statusCode: response.statusCode, detail: detail)
        }

        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            throw APIError.decodingError(error)
        }
    }

    /// POST JSON, returns decoded JSON.
    func post<B: Encodable, T: Decodable>(_ path: String, body: B) async throws -> T {
        let bodyData = try JSONEncoder().encode(body)
        let (data, response) = try await fetch(path: path, method: "POST", body: bodyData)

        guard (200...299).contains(response.statusCode) else {
            let detail = parseErrorDetail(from: data)
            throw APIError.httpError(statusCode: response.statusCode, detail: detail)
        }

        if response.statusCode == 204 || data.isEmpty {
            // Return empty for void-like responses — caller should use `postVoid` instead
            throw APIError.decodingError(
                NSError(domain: "", code: 0,
                        userInfo: [NSLocalizedDescriptionKey: "No content"])
            )
        }

        return try decoder.decode(T.self, from: data)
    }

    /// POST JSON, ignore response body.
    func postVoid<B: Encodable>(_ path: String, body: B) async throws {
        let bodyData = try JSONEncoder().encode(body)
        let (data, response) = try await fetch(path: path, method: "POST", body: bodyData)

        guard (200...299).contains(response.statusCode) else {
            let detail = parseErrorDetail(from: data)
            throw APIError.httpError(statusCode: response.statusCode, detail: detail)
        }
    }

    /// PUT JSON, returns decoded JSON.
    func put<B: Encodable, T: Decodable>(_ path: String, body: B) async throws -> T {
        let bodyData = try JSONEncoder().encode(body)
        let (data, response) = try await fetch(path: path, method: "PUT", body: bodyData)

        guard (200...299).contains(response.statusCode) else {
            let detail = parseErrorDetail(from: data)
            throw APIError.httpError(statusCode: response.statusCode, detail: detail)
        }

        return try decoder.decode(T.self, from: data)
    }

    /// PUT JSON, ignore response body.
    func putVoid<B: Encodable>(_ path: String, body: B) async throws {
        let bodyData = try JSONEncoder().encode(body)
        let (data, response) = try await fetch(path: path, method: "PUT", body: bodyData)

        guard (200...299).contains(response.statusCode) else {
            let detail = parseErrorDetail(from: data)
            throw APIError.httpError(statusCode: response.statusCode, detail: detail)
        }
    }

    /// DELETE, optionally with JSON body.
    func delete(_ path: String) async throws {
        let (data, response) = try await fetch(path: path, method: "DELETE")

        guard (200...299).contains(response.statusCode) else {
            let detail = parseErrorDetail(from: data)
            throw APIError.httpError(statusCode: response.statusCode, detail: detail)
        }
    }

    /// DELETE with JSON body.
    func delete<B: Encodable>(_ path: String, body: B) async throws {
        let bodyData = try JSONEncoder().encode(body)
        let (data, response) = try await fetch(path: path, method: "DELETE", body: bodyData)

        guard (200...299).contains(response.statusCode) else {
            let detail = parseErrorDetail(from: data)
            throw APIError.httpError(statusCode: response.statusCode, detail: detail)
        }
    }

    /// Upload multipart form data (for images).
    func uploadMultipart<T: Decodable>(
        _ path: String,
        fields: [String: String],
        fileField: String,
        fileData: Data,
        fileName: String,
        mimeType: String = "image/jpeg"
    ) async throws -> T {
        let boundary = UUID().uuidString

        var body = Data()

        // Add text fields
        for (key, value) in fields {
            body.append("--\(boundary)\r\n")
            body.append("Content-Disposition: form-data; name=\"\(key)\"\r\n\r\n")
            body.append("\(value)\r\n")
        }

        // Add file
        body.append("--\(boundary)\r\n")
        body.append("Content-Disposition: form-data; name=\"\(fileField)\"; filename=\"\(fileName)\"\r\n")
        body.append("Content-Type: \(mimeType)\r\n\r\n")
        body.append(fileData)
        body.append("\r\n")
        body.append("--\(boundary)--\r\n")

        let (data, response) = try await fetch(
            path: path,
            method: "POST",
            body: body,
            contentType: "multipart/form-data; boundary=\(boundary)"
        )

        guard (200...299).contains(response.statusCode) else {
            let detail = parseErrorDetail(from: data)
            throw APIError.httpError(statusCode: response.statusCode, detail: detail)
        }

        return try decoder.decode(T.self, from: data)
    }

    /// Upload multipart for PUT (profile picture).
    func uploadMultipartPut<T: Decodable>(
        _ path: String,
        fileField: String,
        fileData: Data,
        fileName: String,
        mimeType: String = "image/jpeg"
    ) async throws -> T {
        let boundary = UUID().uuidString

        var body = Data()
        body.append("--\(boundary)\r\n")
        body.append("Content-Disposition: form-data; name=\"\(fileField)\"; filename=\"\(fileName)\"\r\n")
        body.append("Content-Type: \(mimeType)\r\n\r\n")
        body.append(fileData)
        body.append("\r\n")
        body.append("--\(boundary)--\r\n")

        let (data, response) = try await fetch(
            path: path,
            method: "PUT",
            body: body,
            contentType: "multipart/form-data; boundary=\(boundary)"
        )

        guard (200...299).contains(response.statusCode) else {
            let detail = parseErrorDetail(from: data)
            throw APIError.httpError(statusCode: response.statusCode, detail: detail)
        }

        return try decoder.decode(T.self, from: data)
    }

    // MARK: - Helpers

    private func parseErrorDetail(from data: Data) -> String? {
        if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
           let detail = json["detail"] as? String {
            return detail
        }
        return nil
    }
}

// MARK: - Data extension for multipart

private extension Data {
    mutating func append(_ string: String) {
        if let data = string.data(using: .utf8) {
            append(data)
        }
    }
}
