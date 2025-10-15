namespace SunnySeat.Core.Models.Responses;

/// <summary>
/// Authentication result from login operation
/// </summary>
public record AuthResult
{
    /// <summary>
    /// Whether authentication was successful
    /// </summary>
    public bool Success { get; init; }

    /// <summary>
    /// JWT access token (if successful)
    /// </summary>
    public string? AccessToken { get; init; }

    /// <summary>
    /// Refresh token for token renewal (if successful)
    /// </summary>
    public string? RefreshToken { get; init; }

    /// <summary>
    /// When the access token expires
    /// </summary>
    public DateTime? ExpiresAt { get; init; }

    /// <summary>
    /// Admin user information (if successful)
    /// </summary>
    public AdminUserInfo? User { get; init; }

    /// <summary>
    /// Error message (if failed)
    /// </summary>
    public string? ErrorMessage { get; init; }

    /// <summary>
    /// Error code for client handling
    /// </summary>
    public string? ErrorCode { get; init; }
}

/// <summary>
/// Token refresh result
/// </summary>
public record RefreshResult
{
    /// <summary>
    /// Whether refresh was successful
    /// </summary>
    public bool Success { get; init; }

    /// <summary>
    /// New access token (if successful)
    /// </summary>
    public string? AccessToken { get; init; }

    /// <summary>
    /// When the new access token expires
    /// </summary>
    public DateTime? ExpiresAt { get; init; }

    /// <summary>
    /// Error message (if failed)
    /// </summary>
    public string? ErrorMessage { get; init; }

    /// <summary>
    /// Error code for client handling
    /// </summary>
    public string? ErrorCode { get; init; }
}

/// <summary>
/// Admin user information for client responses
/// </summary>
public record AdminUserInfo
{
    /// <summary>
    /// User identifier
    /// </summary>
    public int Id { get; init; }

    /// <summary>
    /// Username
    /// </summary>
    public string Username { get; init; } = string.Empty;

    /// <summary>
    /// Email address
    /// </summary>
    public string Email { get; init; } = string.Empty;

    /// <summary>
    /// User role
    /// </summary>
    public string Role { get; init; } = string.Empty;

    /// <summary>
    /// Additional claims
    /// </summary>
    public List<string> Claims { get; init; } = new();

    /// <summary>
    /// Last login timestamp
    /// </summary>
    public DateTime LastLoginAt { get; init; }
}