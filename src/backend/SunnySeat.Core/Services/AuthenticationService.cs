using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using SunnySeat.Core.Entities;
using SunnySeat.Core.Interfaces;
using SunnySeat.Core.Models.Requests;
using SunnySeat.Core.Models.Responses;
using SunnySeat.Shared.Configuration;
using SunnySeat.Shared.Constants;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;

namespace SunnySeat.Core.Services;

/// <summary>
/// Service for admin authentication operations using JWT tokens
/// </summary>
public class AuthenticationService : IAuthenticationService
{
    private readonly IAdminUserRepository _adminUserRepository;
    private readonly JwtOptions _jwtOptions;
    private readonly JwtSecurityTokenHandler _tokenHandler;
    private readonly TokenValidationParameters _tokenValidationParameters;

    public AuthenticationService(IAdminUserRepository adminUserRepository, IOptions<JwtOptions> jwtOptions)
    {
        _adminUserRepository = adminUserRepository;
        _jwtOptions = jwtOptions.Value;
        _tokenHandler = new JwtSecurityTokenHandler();
        
        var key = Encoding.ASCII.GetBytes(_jwtOptions.SecretKey);
        _tokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(key),
            ValidateIssuer = true,
            ValidIssuer = _jwtOptions.Issuer,
            ValidateAudience = true,
            ValidAudience = _jwtOptions.Audience,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero
        };
    }

    public async Task<AuthResult> LoginAsync(LoginRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            // Find user by username
            var user = await _adminUserRepository.GetByUsernameAsync(request.Username, cancellationToken);
            if (user == null)
            {
                return new AuthResult
                {
                    Success = false,
                    ErrorCode = AuthErrorCodes.InvalidCredentials,
                    ErrorMessage = "Invalid username or password"
                };
            }

            // Check if user is active
            if (!user.IsActive)
            {
                return new AuthResult
                {
                    Success = false,
                    ErrorCode = AuthErrorCodes.AccountInactive,
                    ErrorMessage = "User account is not active"
                };
            }

            // Validate password
            if (!ValidatePassword(request.Password, user.PasswordHash))
            {
                return new AuthResult
                {
                    Success = false,
                    ErrorCode = AuthErrorCodes.InvalidCredentials,
                    ErrorMessage = "Invalid username or password"
                };
            }

            // Generate tokens
            var accessToken = GenerateAccessToken(user);
            var refreshToken = GenerateRefreshToken();
            var expiresAt = DateTime.UtcNow.AddMinutes(_jwtOptions.ExpirationMinutes);

            // Update user with new refresh token and last login
            await _adminUserRepository.UpdateRefreshTokenAsync(
                user.Id, 
                refreshToken, 
                DateTime.UtcNow.AddDays(_jwtOptions.RefreshTokenExpirationDays), 
                cancellationToken);
            
            await _adminUserRepository.UpdateLastLoginAsync(user.Id, DateTime.UtcNow, cancellationToken);

            return new AuthResult
            {
                Success = true,
                AccessToken = accessToken,
                RefreshToken = refreshToken,
                ExpiresAt = expiresAt,
                User = new AdminUserInfo
                {
                    Id = user.Id,
                    Username = user.Username,
                    Email = user.Email,
                    Role = user.Role,
                    Claims = user.Claims,
                    LastLoginAt = DateTime.UtcNow
                }
            };
        }
        catch (Exception ex)
        {
            return new AuthResult
            {
                Success = false,
                ErrorCode = "AUTHENTICATION_ERROR",
                ErrorMessage = "An error occurred during authentication"
            };
        }
    }

    public async Task<RefreshResult> RefreshTokenAsync(string refreshToken, CancellationToken cancellationToken = default)
    {
        try
        {
            // Find user by refresh token
            var user = await _adminUserRepository.GetByRefreshTokenAsync(refreshToken, cancellationToken);
            if (user == null)
            {
                return new RefreshResult
                {
                    Success = false,
                    ErrorCode = AuthErrorCodes.InvalidRefreshToken,
                    ErrorMessage = "Invalid or expired refresh token"
                };
            }

            // Check if user is still active
            if (!user.IsActive)
            {
                return new RefreshResult
                {
                    Success = false,
                    ErrorCode = AuthErrorCodes.AccountInactive,
                    ErrorMessage = "User account is not active"
                };
            }

            // Generate new access token
            var accessToken = GenerateAccessToken(user);
            var expiresAt = DateTime.UtcNow.AddMinutes(_jwtOptions.ExpirationMinutes);

            return new RefreshResult
            {
                Success = true,
                AccessToken = accessToken,
                ExpiresAt = expiresAt
            };
        }
        catch (Exception ex)
        {
            return new RefreshResult
            {
                Success = false,
                ErrorCode = "REFRESH_ERROR",
                ErrorMessage = "An error occurred during token refresh"
            };
        }
    }

    public async Task<bool> LogoutAsync(string refreshToken, CancellationToken cancellationToken = default)
    {
        try
        {
            var user = await _adminUserRepository.GetByRefreshTokenAsync(refreshToken, cancellationToken);
            if (user == null) return true; // Already logged out

            // Clear refresh token
            await _adminUserRepository.UpdateRefreshTokenAsync(user.Id, null, null, cancellationToken);
            return true;
        }
        catch
        {
            return false;
        }
    }

    public string GenerateAccessToken(AdminUser adminUser)
    {
        var key = Encoding.ASCII.GetBytes(_jwtOptions.SecretKey);
        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.NameIdentifier, adminUser.Id.ToString()),
                new Claim(ClaimTypes.Name, adminUser.Username),
                new Claim(ClaimTypes.Email, adminUser.Email),
                new Claim(ClaimTypes.Role, adminUser.Role),
                new Claim("role", adminUser.Role) // Custom claim for policies
            }),
            Expires = DateTime.UtcNow.AddMinutes(_jwtOptions.ExpirationMinutes),
            Issuer = _jwtOptions.Issuer,
            Audience = _jwtOptions.Audience,
            SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
        };

        // Add custom claims
        foreach (var claim in adminUser.Claims)
        {
            tokenDescriptor.Subject.AddClaim(new Claim("custom", claim));
        }

        var token = _tokenHandler.CreateToken(tokenDescriptor);
        return _tokenHandler.WriteToken(token);
    }

    public string GenerateRefreshToken()
    {
        var randomBytes = new byte[64];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(randomBytes);
        return Convert.ToBase64String(randomBytes);
    }

    public bool ValidatePassword(string password, string hash)
    {
        return BCrypt.Net.BCrypt.Verify(password, hash);
    }

    public string HashPassword(string password)
    {
        return BCrypt.Net.BCrypt.HashPassword(password, BCrypt.Net.BCrypt.GenerateSalt(12));
    }
}