using System.ComponentModel.DataAnnotations;

namespace SunnySeat.Core.Models.Requests;

/// <summary>
/// Login request with admin credentials
/// </summary>
public record LoginRequest
{
    /// <summary>
    /// Admin username
    /// </summary>
    [Required]
    [StringLength(50, MinimumLength = 3)]
    public string Username { get; init; } = string.Empty;

    /// <summary>
    /// Admin password
    /// </summary>
    [Required]
    [StringLength(100, MinimumLength = 8)]
    public string Password { get; init; } = string.Empty;
}

/// <summary>
/// Token refresh request
/// </summary>
public record RefreshRequest
{
    /// <summary>
    /// Valid refresh token
    /// </summary>
    [Required]
    public string RefreshToken { get; init; } = string.Empty;
}

/// <summary>
/// Logout request
/// </summary>
public record LogoutRequest
{
    /// <summary>
    /// Refresh token to revoke
    /// </summary>
    [Required]
    public string RefreshToken { get; init; } = string.Empty;
}

/// <summary>
/// Change password request
/// </summary>
public record ChangePasswordRequest
{
    /// <summary>
    /// Current password for verification
    /// </summary>
    [Required]
    public string CurrentPassword { get; init; } = string.Empty;

    /// <summary>
    /// New password to set
    /// </summary>
    [Required]
    [StringLength(100, MinimumLength = 8)]
    public string NewPassword { get; init; } = string.Empty;
}