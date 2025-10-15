using FluentAssertions;
using Microsoft.Extensions.Options;
using Moq;
using SunnySeat.Core.Entities;
using SunnySeat.Core.Interfaces;
using SunnySeat.Core.Models.Requests;
using SunnySeat.Core.Services;
using SunnySeat.Shared.Configuration;
using Xunit;

namespace SunnySeat.Core.Tests.Services;

/// <summary>
/// Tests for AuthenticationService
/// </summary>
public class AuthenticationServiceTests
{
    private readonly Mock<IAdminUserRepository> _adminUserRepositoryMock;
    private readonly Mock<IOptions<JwtOptions>> _jwtOptionsMock;
    private readonly AuthenticationService _authenticationService;
    private readonly JwtOptions _jwtOptions;

    public AuthenticationServiceTests()
    {
        _adminUserRepositoryMock = new Mock<IAdminUserRepository>();
        _jwtOptionsMock = new Mock<IOptions<JwtOptions>>();
        
        _jwtOptions = new JwtOptions
        {
            SecretKey = "test-secret-key-that-is-long-enough-for-security-requirements",
            Issuer = "SunnySeat.Test",
            Audience = "SunnySeat.Admin.Test",
            ExpirationMinutes = 60,
            RefreshTokenExpirationDays = 7
        };
        
        _jwtOptionsMock.Setup(x => x.Value).Returns(_jwtOptions);
        _authenticationService = new AuthenticationService(_adminUserRepositoryMock.Object, _jwtOptionsMock.Object);
    }

    [Fact]
    public async Task LoginAsync_WithValidCredentials_ReturnsSuccessResult()
    {
        // Arrange
        var request = new LoginRequest { Username = "testuser", Password = "testpassword" };
        var passwordHash = _authenticationService.HashPassword("testpassword");
        var adminUser = new AdminUser
        {
            Id = 1,
            Username = "testuser",
            Email = "test@example.com",
            PasswordHash = passwordHash,
            Role = "Admin", // Use string literals instead of constants
            IsActive = true
        };

        _adminUserRepositoryMock.Setup(x => x.GetByUsernameAsync(request.Username, default))
            .ReturnsAsync(adminUser);
        _adminUserRepositoryMock.Setup(x => x.UpdateRefreshTokenAsync(It.IsAny<int>(), It.IsAny<string>(), It.IsAny<DateTime>(), default))
            .ReturnsAsync(true);
        _adminUserRepositoryMock.Setup(x => x.UpdateLastLoginAsync(It.IsAny<int>(), It.IsAny<DateTime>(), default))
            .ReturnsAsync(true);

        // Act
        var result = await _authenticationService.LoginAsync(request);

        // Assert
        result.Should().NotBeNull();
        result.Success.Should().BeTrue();
        result.AccessToken.Should().NotBeNullOrEmpty();
        result.RefreshToken.Should().NotBeNullOrEmpty();
        result.ExpiresAt.Should().BeAfter(DateTime.UtcNow);
        result.User.Should().NotBeNull();
        result.User!.Username.Should().Be("testuser");
        result.User.Role.Should().Be("Admin");
    }

    [Fact]
    public async Task LoginAsync_WithInvalidUsername_ReturnsFailureResult()
    {
        // Arrange
        var request = new LoginRequest { Username = "nonexistent", Password = "testpassword" };
        
        _adminUserRepositoryMock.Setup(x => x.GetByUsernameAsync(request.Username, default))
            .ReturnsAsync((AdminUser?)null);

        // Act
        var result = await _authenticationService.LoginAsync(request);

        // Assert
        result.Should().NotBeNull();
        result.Success.Should().BeFalse();
        result.ErrorCode.Should().Be("INVALID_CREDENTIALS");
        result.ErrorMessage.Should().Be("Invalid username or password");
        result.AccessToken.Should().BeNull();
        result.RefreshToken.Should().BeNull();
    }

    [Fact]
    public async Task LoginAsync_WithInvalidPassword_ReturnsFailureResult()
    {
        // Arrange
        var request = new LoginRequest { Username = "testuser", Password = "wrongpassword" };
        var passwordHash = _authenticationService.HashPassword("correctpassword");
        var adminUser = new AdminUser
        {
            Id = 1,
            Username = "testuser",
            PasswordHash = passwordHash,
            IsActive = true
        };

        _adminUserRepositoryMock.Setup(x => x.GetByUsernameAsync(request.Username, default))
            .ReturnsAsync(adminUser);

        // Act
        var result = await _authenticationService.LoginAsync(request);

        // Assert
        result.Should().NotBeNull();
        result.Success.Should().BeFalse();
        result.ErrorCode.Should().Be("INVALID_CREDENTIALS");
        result.ErrorMessage.Should().Be("Invalid username or password");
    }

    [Fact]
    public async Task LoginAsync_WithInactiveUser_ReturnsFailureResult()
    {
        // Arrange
        var request = new LoginRequest { Username = "testuser", Password = "testpassword" };
        var passwordHash = _authenticationService.HashPassword("testpassword");
        var adminUser = new AdminUser
        {
            Id = 1,
            Username = "testuser",
            PasswordHash = passwordHash,
            IsActive = false // User is inactive
        };

        _adminUserRepositoryMock.Setup(x => x.GetByUsernameAsync(request.Username, default))
            .ReturnsAsync(adminUser);

        // Act
        var result = await _authenticationService.LoginAsync(request);

        // Assert
        result.Should().NotBeNull();
        result.Success.Should().BeFalse();
        result.ErrorCode.Should().Be("ACCOUNT_INACTIVE");
        result.ErrorMessage.Should().Be("User account is not active");
    }

    [Fact]
    public async Task RefreshTokenAsync_WithValidToken_ReturnsNewAccessToken()
    {
        // Arrange
        var refreshToken = "valid-refresh-token";
        var adminUser = new AdminUser
        {
            Id = 1,
            Username = "testuser",
            Email = "test@example.com",
            Role = "Admin",
            IsActive = true,
            RefreshToken = refreshToken,
            RefreshTokenExpiresAt = DateTime.UtcNow.AddDays(7)
        };

        _adminUserRepositoryMock.Setup(x => x.GetByRefreshTokenAsync(refreshToken, default))
            .ReturnsAsync(adminUser);

        // Act
        var result = await _authenticationService.RefreshTokenAsync(refreshToken);

        // Assert
        result.Should().NotBeNull();
        result.Success.Should().BeTrue();
        result.AccessToken.Should().NotBeNullOrEmpty();
        result.ExpiresAt.Should().BeAfter(DateTime.UtcNow);
    }

    [Fact]
    public async Task RefreshTokenAsync_WithInvalidToken_ReturnsFailureResult()
    {
        // Arrange
        var refreshToken = "invalid-refresh-token";
        
        _adminUserRepositoryMock.Setup(x => x.GetByRefreshTokenAsync(refreshToken, default))
            .ReturnsAsync((AdminUser?)null);

        // Act
        var result = await _authenticationService.RefreshTokenAsync(refreshToken);

        // Assert
        result.Should().NotBeNull();
        result.Success.Should().BeFalse();
        result.ErrorCode.Should().Be("INVALID_REFRESH_TOKEN");
        result.ErrorMessage.Should().Be("Invalid or expired refresh token");
    }

    [Fact]
    public async Task LogoutAsync_WithValidToken_ClearsRefreshToken()
    {
        // Arrange
        var refreshToken = "valid-refresh-token";
        var adminUser = new AdminUser
        {
            Id = 1,
            RefreshToken = refreshToken,
            RefreshTokenExpiresAt = DateTime.UtcNow.AddDays(7)
        };

        _adminUserRepositoryMock.Setup(x => x.GetByRefreshTokenAsync(refreshToken, default))
            .ReturnsAsync(adminUser);
        _adminUserRepositoryMock.Setup(x => x.UpdateRefreshTokenAsync(1, null, null, default))
            .ReturnsAsync(true);

        // Act
        var result = await _authenticationService.LogoutAsync(refreshToken);

        // Assert
        result.Should().BeTrue();
        _adminUserRepositoryMock.Verify(x => x.UpdateRefreshTokenAsync(1, null, null, default), Times.Once);
    }

    [Fact]
    public void GenerateAccessToken_WithValidUser_ReturnsJwtToken()
    {
        // Arrange
        var adminUser = new AdminUser
        {
            Id = 1,
            Username = "testuser",
            Email = "test@example.com",
            Role = "Admin",
            Claims = new List<string> { "test-claim" }
        };

        // Act
        var token = _authenticationService.GenerateAccessToken(adminUser);

        // Assert
        token.Should().NotBeNullOrEmpty();
        token.Split('.').Should().HaveCount(3); // JWT has 3 parts separated by dots
    }

    [Fact]
    public void GenerateRefreshToken_ReturnsBase64String()
    {
        // Act
        var refreshToken = _authenticationService.GenerateRefreshToken();

        // Assert
        refreshToken.Should().NotBeNullOrEmpty();
        
        // Should be valid base64
        var act = () => Convert.FromBase64String(refreshToken);
        act.Should().NotThrow();
    }

    [Theory]
    [InlineData("password123", true)]
    [InlineData("wrongpassword", false)]
    public void ValidatePassword_WithHashedPassword_ReturnsCorrectResult(string testPassword, bool shouldMatch)
    {
        // Arrange
        var correctPassword = "password123";
        var hash = _authenticationService.HashPassword(correctPassword);

        // Act
        var result = _authenticationService.ValidatePassword(testPassword, hash);

        // Assert
        result.Should().Be(shouldMatch);
    }

    [Fact]
    public void HashPassword_WithPlainTextPassword_ReturnsBCryptHash()
    {
        // Arrange
        var password = "testpassword123";

        // Act
        var hash = _authenticationService.HashPassword(password);

        // Assert
        hash.Should().NotBeNullOrEmpty();
        hash.Should().StartWith("$2a$"); // BCrypt hash prefix
        hash.Length.Should().Be(60); // BCrypt hash length
    }

    [Fact]
    public void HashPassword_WithSamePassword_ReturnsDifferentHashes()
    {
        // Arrange
        var password = "testpassword123";

        // Act
        var hash1 = _authenticationService.HashPassword(password);
        var hash2 = _authenticationService.HashPassword(password);

        // Assert
        hash1.Should().NotBe(hash2); // BCrypt uses random salt
        _authenticationService.ValidatePassword(password, hash1).Should().BeTrue();
        _authenticationService.ValidatePassword(password, hash2).Should().BeTrue();
    }
}