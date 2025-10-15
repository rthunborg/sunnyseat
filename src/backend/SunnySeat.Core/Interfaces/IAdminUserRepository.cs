using SunnySeat.Core.Entities;

namespace SunnySeat.Core.Interfaces;

/// <summary>
/// Repository interface for admin user data access
/// </summary>
public interface IAdminUserRepository
{
    /// <summary>
    /// Find admin user by username
    /// </summary>
    /// <param name="username">Username to search for</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Admin user if found, null otherwise</returns>
    Task<AdminUser?> GetByUsernameAsync(string username, CancellationToken cancellationToken = default);

    /// <summary>
    /// Find admin user by email
    /// </summary>
    /// <param name="email">Email to search for</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Admin user if found, null otherwise</returns>
    Task<AdminUser?> GetByEmailAsync(string email, CancellationToken cancellationToken = default);

    /// <summary>
    /// Find admin user by refresh token
    /// </summary>
    /// <param name="refreshToken">Refresh token to search for</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Admin user if found, null otherwise</returns>
    Task<AdminUser?> GetByRefreshTokenAsync(string refreshToken, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get admin user by ID
    /// </summary>
    /// <param name="id">User ID</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Admin user if found, null otherwise</returns>
    Task<AdminUser?> GetByIdAsync(int id, CancellationToken cancellationToken = default);

    /// <summary>
    /// Create new admin user
    /// </summary>
    /// <param name="adminUser">Admin user to create</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Created admin user with generated ID</returns>
    Task<AdminUser> CreateAsync(AdminUser adminUser, CancellationToken cancellationToken = default);

    /// <summary>
    /// Update existing admin user
    /// </summary>
    /// <param name="adminUser">Admin user to update</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Updated admin user</returns>
    Task<AdminUser> UpdateAsync(AdminUser adminUser, CancellationToken cancellationToken = default);

    /// <summary>
    /// Update admin user's refresh token
    /// </summary>
    /// <param name="userId">User ID</param>
    /// <param name="refreshToken">New refresh token (null to clear)</param>
    /// <param name="expiresAt">Token expiration (null if clearing token)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>True if updated successfully</returns>
    Task<bool> UpdateRefreshTokenAsync(int userId, string? refreshToken, DateTime? expiresAt, CancellationToken cancellationToken = default);

    /// <summary>
    /// Update admin user's last login time
    /// </summary>
    /// <param name="userId">User ID</param>
    /// <param name="loginTime">Login timestamp</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>True if updated successfully</returns>
    Task<bool> UpdateLastLoginAsync(int userId, DateTime loginTime, CancellationToken cancellationToken = default);
}