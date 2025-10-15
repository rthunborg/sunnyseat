namespace SunnySeat.Core.Entities;

/// <summary>
/// Admin user entity for system authentication and authorization
/// </summary>
public class AdminUser
{
    /// <summary>
    /// Unique identifier for the admin user
    /// </summary>
    public int Id { get; set; }

    /// <summary>
    /// Unique username for login
    /// </summary>
    public string Username { get; set; } = string.Empty;

    /// <summary>
    /// Email address for the admin user
    /// </summary>
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// BCrypt hashed password
    /// </summary>
    public string PasswordHash { get; set; } = string.Empty;

    /// <summary>
    /// Admin role (Admin, SuperAdmin)
    /// </summary>
    public string Role { get; set; } = "Admin";

    /// <summary>
    /// Whether the admin user is currently active
    /// </summary>
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// When the admin user was created
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Last successful login timestamp
    /// </summary>
    public DateTime LastLoginAt { get; set; }

    /// <summary>
    /// Additional claims for fine-grained permissions
    /// </summary>
    public List<string> Claims { get; set; } = new();

    /// <summary>
    /// Current active refresh token (only one allowed)
    /// </summary>
    public string? RefreshToken { get; set; }

    /// <summary>
    /// When the current refresh token expires
    /// </summary>
    public DateTime? RefreshTokenExpiresAt { get; set; }
}