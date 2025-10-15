namespace SunnySeat.Shared.Constants;

/// <summary>
/// Authentication and authorization error codes
/// </summary>
public static class AuthErrorCodes
{
    /// <summary>
    /// Invalid username or password provided
    /// </summary>
    public const string InvalidCredentials = "INVALID_CREDENTIALS";

    /// <summary>
    /// JWT token has expired
    /// </summary>
    public const string TokenExpired = "TOKEN_EXPIRED";

    /// <summary>
    /// JWT token is invalid or malformed
    /// </summary>
    public const string InvalidToken = "INVALID_TOKEN";

    /// <summary>
    /// User does not have sufficient permissions for the requested operation
    /// </summary>
    public const string InsufficientPermissions = "INSUFFICIENT_PERMISSIONS";

    /// <summary>
    /// Rate limit exceeded for authentication requests
    /// </summary>
    public const string RateLimitExceeded = "RATE_LIMIT_EXCEEDED";

    /// <summary>
    /// Refresh token is invalid or expired
    /// </summary>
    public const string InvalidRefreshToken = "INVALID_REFRESH_TOKEN";

    /// <summary>
    /// User account is not active
    /// </summary>
    public const string AccountInactive = "ACCOUNT_INACTIVE";

    /// <summary>
    /// User account is locked due to too many failed attempts
    /// </summary>
    public const string AccountLocked = "ACCOUNT_LOCKED";
}