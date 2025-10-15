using Microsoft.AspNetCore.Authorization;
using SunnySeat.Core.Interfaces;
using SunnySeat.Core.Models.Requests;
using System.Security.Claims;

namespace SunnySeat.Api.Endpoints;

/// <summary>
/// Authentication endpoints for admin login, logout, and token management
/// </summary>
public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/api/auth")
            .WithTags("Authentication");

        // Login endpoint - public access
        group.MapPost("/login", LoginAsync)
            .WithName("AdminLogin")
            .WithSummary("Authenticate admin user with username and password")
            .Accepts<LoginRequest>("application/json")
            .Produces<object>(200, "application/json")
            .Produces<object>(400, "application/json")
            .Produces<object>(401, "application/json")
            .AllowAnonymous();

        // Token refresh endpoint - public access (requires refresh token)
        group.MapPost("/refresh", RefreshTokenAsync)
            .WithName("RefreshToken")
            .WithSummary("Refresh expired access token using refresh token")
            .Accepts<RefreshRequest>("application/json")
            .Produces<object>(200, "application/json")
            .Produces<object>(400, "application/json")
            .Produces<object>(401, "application/json")
            .AllowAnonymous();

        // Logout endpoint - requires authentication
        group.MapPost("/logout", LogoutAsync)
            .WithName("AdminLogout")
            .WithSummary("Logout admin user and revoke refresh token")
            .Accepts<LogoutRequest>("application/json")
            .Produces<object>(200, "application/json")
            .RequireAuthorization();

        // Change password endpoint - requires authentication
        group.MapPost("/change-password", ChangePasswordAsync)
            .WithName("ChangePassword")
            .WithSummary("Change admin user password")
            .Accepts<ChangePasswordRequest>("application/json")
            .Produces<object>(200, "application/json")
            .Produces<object>(400, "application/json")
            .RequireAuthorization();

        // Get current user info endpoint - requires authentication
        group.MapGet("/me", GetCurrentUserAsync)
            .WithName("GetCurrentUser")
            .WithSummary("Get current authenticated admin user information")
            .Produces<object>(200, "application/json")
            .Produces<object>(401, "application/json")
            .RequireAuthorization();
    }

    private static async Task<IResult> LoginAsync(
        LoginRequest request,
        IAuthenticationService authService)
    {
        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
        {
            return Results.BadRequest(new { error = "Username and password are required" });
        }

        var result = await authService.LoginAsync(request);

        if (!result.Success)
        {
            return Results.Json(new { error = result.ErrorMessage, code = result.ErrorCode }, statusCode: 401);
        }

        return Results.Ok(new
        {
            accessToken = result.AccessToken,
            refreshToken = result.RefreshToken,
            expiresAt = result.ExpiresAt,
            user = result.User
        });
    }

    private static async Task<IResult> RefreshTokenAsync(
        RefreshRequest request,
        IAuthenticationService authService)
    {
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
        {
            return Results.BadRequest(new { error = "Refresh token is required" });
        }

        var result = await authService.RefreshTokenAsync(request.RefreshToken);

        if (!result.Success)
        {
            return Results.Json(new { error = result.ErrorMessage, code = result.ErrorCode }, statusCode: 401);
        }

        return Results.Ok(new
        {
            accessToken = result.AccessToken,
            expiresAt = result.ExpiresAt
        });
    }

    private static async Task<IResult> LogoutAsync(
        LogoutRequest request,
        IAuthenticationService authService)
    {
        if (string.IsNullOrWhiteSpace(request.RefreshToken))
        {
            return Results.BadRequest(new { error = "Refresh token is required" });
        }

        var success = await authService.LogoutAsync(request.RefreshToken);

        if (!success)
        {
            return Results.BadRequest(new { error = "Failed to logout" });
        }

        return Results.Ok(new { message = "Successfully logged out" });
    }

    private static async Task<IResult> ChangePasswordAsync(
        ChangePasswordRequest request,
        IAuthenticationService authService,
        IAdminUserRepository userRepository,
        ClaimsPrincipal user)
    {
        var userIdClaim = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim == null || !int.TryParse(userIdClaim, out var userId))
        {
            return Results.Json(new { error = "Unauthorized" }, statusCode: 401);
        }

        var adminUser = await userRepository.GetByIdAsync(userId);
        if (adminUser == null)
        {
            return Results.NotFound(new { error = "User not found" });
        }

        // Verify current password
        if (!authService.ValidatePassword(request.CurrentPassword, adminUser.PasswordHash))
        {
            return Results.BadRequest(new { error = "Current password is incorrect" });
        }

        // Update password
        adminUser.PasswordHash = authService.HashPassword(request.NewPassword);
        await userRepository.UpdateAsync(adminUser);

        // Clear refresh token to force re-login
        await userRepository.UpdateRefreshTokenAsync(userId, null, null);

        return Results.Ok(new { message = "Password changed successfully" });
    }

    private static async Task<IResult> GetCurrentUserAsync(
        IAdminUserRepository userRepository,
        ClaimsPrincipal user)
    {
        var userIdClaim = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (userIdClaim == null || !int.TryParse(userIdClaim, out var userId))
        {
            return Results.Json(new { error = "Unauthorized" }, statusCode: 401);
        }

        var adminUser = await userRepository.GetByIdAsync(userId);
        if (adminUser == null)
        {
            return Results.NotFound();
        }

        return Results.Ok(new
        {
            id = adminUser.Id,
            username = adminUser.Username,
            email = adminUser.Email,
            role = adminUser.Role,
            claims = adminUser.Claims,
            lastLoginAt = adminUser.LastLoginAt,
            createdAt = adminUser.CreatedAt
        });
    }
}