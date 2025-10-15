using SunnySeat.Core.Entities;
using SunnySeat.Core.Models.Requests;
using SunnySeat.Core.Models.Responses;

namespace SunnySeat.Core.Interfaces;

/// <summary>
/// Interface for admin authentication operations
/// </summary>
public interface IAuthenticationService
{
    /// <summary>
    /// Authenticate admin user with username and password
    /// </summary>
    /// <param name="request">Login credentials</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Authentication result with tokens if successful</returns>
    Task<AuthResult> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// Refresh access token using refresh token
    /// </summary>
    /// <param name="refreshToken">Valid refresh token</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>New access token if refresh token is valid</returns>
    Task<RefreshResult> RefreshTokenAsync(string refreshToken, CancellationToken cancellationToken = default);

    /// <summary>
    /// Logout admin user and revoke refresh token
    /// </summary>
    /// <param name="refreshToken">Refresh token to revoke</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>True if successfully logged out</returns>
    Task<bool> LogoutAsync(string refreshToken, CancellationToken cancellationToken = default);

    /// <summary>
    /// Generate JWT access token for authenticated admin user
    /// </summary>
    /// <param name="adminUser">Admin user to create token for</param>
    /// <returns>JWT token string</returns>
    string GenerateAccessToken(AdminUser adminUser);

    /// <summary>
    /// Generate secure refresh token
    /// </summary>
    /// <returns>Refresh token string</returns>
    string GenerateRefreshToken();

    /// <summary>
    /// Validate password against hash
    /// </summary>
    /// <param name="password">Plain text password</param>
    /// <param name="hash">BCrypt password hash</param>
    /// <returns>True if password matches hash</returns>
    bool ValidatePassword(string password, string hash);

    /// <summary>
    /// Hash password using BCrypt
    /// </summary>
    /// <param name="password">Plain text password</param>
    /// <returns>BCrypt hash</returns>
    string HashPassword(string password);
}