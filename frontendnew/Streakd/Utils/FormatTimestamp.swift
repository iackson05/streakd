import Foundation

/// Formats an ISO 8601 timestamp into a relative time string (e.g. "2h ago", "Just now").
func formatTimestamp(_ isoString: String?) -> String {
    guard let isoString else { return "" }

    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

    guard let date = formatter.date(from: isoString) else {
        // Try without fractional seconds
        formatter.formatOptions = [.withInternetDateTime]
        guard let date = formatter.date(from: isoString) else { return "" }
        return relativeTime(from: date)
    }

    return relativeTime(from: date)
}

private func relativeTime(from date: Date) -> String {
    let seconds = Int(Date().timeIntervalSince(date))

    if seconds < 60 { return "Just now" }
    if seconds < 3600 { return "\(seconds / 60)m ago" }
    if seconds < 86400 { return "\(seconds / 3600)h ago" }
    if seconds < 604800 { return "\(seconds / 86400)d ago" }

    let dateFormatter = DateFormatter()
    dateFormatter.dateFormat = "MMM d"
    return dateFormatter.string(from: date)
}
