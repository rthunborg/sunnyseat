using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace SunnySeat.Integration.Tests.Shared;

/// <summary>
/// Helper class to generate JWT tokens for integration testing
/// Bypasses the need for authentication endpoints during tests
/// </summary>
public static class TestJwtTokenGenerator
{
    private const string TestSecretKey = "test-super-secret-key-for-integration-tests-only-minimum-32-characters-long";
    private const string TestIssuer = "SunnySeat.IntegrationTests";
    private const string TestAudience = "SunnySeat.Api.Test";

    /// <summary>
    /// Generates a test JWT token for the specified username with admin claims
    /// </summary>
    /// <param name="username">Username for the token</param>
    /// <param name="userId">User ID (default: test-admin-id)</param>
    /// <param name="expiryMinutes">Token expiry in minutes (default: 60)</param>
    /// <returns>JWT token string</returns>
    public static string GenerateToken(string username, string userId = "test-admin-id", int expiryMinutes = 60)
    {
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.ASCII.GetBytes(TestSecretKey);

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, userId),
            new Claim(ClaimTypes.Name, username),
            new Claim(ClaimTypes.Email, $"{username}@test.com"),
            new Claim(ClaimTypes.Role, "Admin"), // Use ClaimTypes.Role for compatibility
            new Claim("scope", "admin:read admin:write venues:manage")
        };

        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Expires = DateTime.UtcNow.AddMinutes(expiryMinutes),
            Issuer = TestIssuer,
            Audience = TestAudience,
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(key),
                SecurityAlgorithms.HmacSha256Signature)
        };

        var token = tokenHandler.CreateToken(tokenDescriptor);
        return tokenHandler.WriteToken(token);
    }

    /// <summary>
    /// Gets the test JWT configuration for configuring test services
    /// </summary>
    public static (string SecretKey, string Issuer, string Audience) GetTestJwtConfig()
    {
        return (TestSecretKey, TestIssuer, TestAudience);
    }
}
