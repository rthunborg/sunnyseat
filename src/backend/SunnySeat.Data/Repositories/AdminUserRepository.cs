using Microsoft.EntityFrameworkCore;
using SunnySeat.Core.Entities;
using SunnySeat.Core.Interfaces;

namespace SunnySeat.Data.Repositories;

/// <summary>
/// Repository implementation for admin user data access
/// </summary>
public class AdminUserRepository : IAdminUserRepository
{
    private readonly SunnySeatDbContext _dbContext;

    public AdminUserRepository(SunnySeatDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<AdminUser?> GetByUsernameAsync(string username, CancellationToken cancellationToken = default)
    {
        return await _dbContext.AdminUsers
            .FirstOrDefaultAsync(u => u.Username == username, cancellationToken);
    }

    public async Task<AdminUser?> GetByEmailAsync(string email, CancellationToken cancellationToken = default)
    {
        return await _dbContext.AdminUsers
            .FirstOrDefaultAsync(u => u.Email == email, cancellationToken);
    }

    public async Task<AdminUser?> GetByRefreshTokenAsync(string refreshToken, CancellationToken cancellationToken = default)
    {
        return await _dbContext.AdminUsers
            .FirstOrDefaultAsync(u => u.RefreshToken == refreshToken && 
                                     u.RefreshTokenExpiresAt > DateTime.UtcNow, 
                                cancellationToken);
    }

    public async Task<AdminUser?> GetByIdAsync(int id, CancellationToken cancellationToken = default)
    {
        return await _dbContext.AdminUsers
            .FirstOrDefaultAsync(u => u.Id == id, cancellationToken);
    }

    public async Task<AdminUser> CreateAsync(AdminUser adminUser, CancellationToken cancellationToken = default)
    {
        adminUser.CreatedAt = DateTime.UtcNow;
        _dbContext.AdminUsers.Add(adminUser);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return adminUser;
    }

    public async Task<AdminUser> UpdateAsync(AdminUser adminUser, CancellationToken cancellationToken = default)
    {
        _dbContext.AdminUsers.Update(adminUser);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return adminUser;
    }

    public async Task<bool> UpdateRefreshTokenAsync(int userId, string? refreshToken, DateTime? expiresAt, CancellationToken cancellationToken = default)
    {
        var user = await GetByIdAsync(userId, cancellationToken);
        if (user == null) return false;

        user.RefreshToken = refreshToken;
        user.RefreshTokenExpiresAt = expiresAt;
        
        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> UpdateLastLoginAsync(int userId, DateTime loginTime, CancellationToken cancellationToken = default)
    {
        var user = await GetByIdAsync(userId, cancellationToken);
        if (user == null) return false;

        user.LastLoginAt = loginTime;
        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }
}