namespace SunnySeat.Shared.Configuration;

/// <summary>
/// Configuration options for JWT authentication
/// </summary>
public class JwtOptions
{
    public const string SectionName = "Jwt";

    /// <summary>
    /// Secret key for JWT token signing (minimum 32 characters)
    /// </summary>
    public string SecretKey { get; set; } = string.Empty;

    /// <summary>
    /// Token issuer identifier
    /// </summary>
    public string Issuer { get; set; } = string.Empty;

    /// <summary>
    /// Token audience identifier
    /// </summary>
    public string Audience { get; set; } = string.Empty;

    /// <summary>
    /// Access token expiration time in minutes (default: 8 hours)
    /// </summary>
    public int ExpirationMinutes { get; set; } = 480;

    /// <summary>
    /// Refresh token expiration time in days (default: 7 days)
    /// </summary>
    public int RefreshTokenExpirationDays { get; set; } = 7;

    /// <summary>
    /// Validates that all required JWT options are properly configured
    /// </summary>
    public bool IsValid => 
        !string.IsNullOrEmpty(SecretKey) && SecretKey.Length >= 32 &&
        !string.IsNullOrEmpty(Issuer) &&
        !string.IsNullOrEmpty(Audience) &&
        ExpirationMinutes > 0 &&
        RefreshTokenExpirationDays > 0;
}