using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using SunnySeat.Core.Entities;
using System.Text.Json;

namespace SunnySeat.Data.Configurations;

/// <summary>
/// Entity Framework configuration for AdminUser entity
/// </summary>
public class AdminUserConfiguration : IEntityTypeConfiguration<AdminUser>
{
    public void Configure(EntityTypeBuilder<AdminUser> builder)
    {
        builder.ToTable("admin_users");
        
        // Primary key
        builder.HasKey(e => e.Id);
        
        // Username - unique and required
        builder.Property(e => e.Username)
            .HasMaxLength(50)
            .IsRequired();
        builder.HasIndex(e => e.Username)
            .IsUnique()
            .HasDatabaseName("IX_AdminUsers_Username");
        
        // Email - unique and required
        builder.Property(e => e.Email)
            .HasMaxLength(255)
            .IsRequired();
        builder.HasIndex(e => e.Email)
            .IsUnique()
            .HasDatabaseName("IX_AdminUsers_Email");
        
        // Password hash - required
        builder.Property(e => e.PasswordHash)
            .HasMaxLength(255)
            .IsRequired();
        
        // Role with default value
        builder.Property(e => e.Role)
            .HasMaxLength(50)
            .IsRequired()
            .HasDefaultValue("Admin");
        
        // Active status with default
        builder.Property(e => e.IsActive)
            .IsRequired()
            .HasDefaultValue(true);
        
        // Audit timestamps
        builder.Property(e => e.CreatedAt)
            .HasDefaultValueSql("CURRENT_TIMESTAMP")
            .IsRequired();
        
        builder.Property(e => e.LastLoginAt)
            .HasColumnType("timestamp with time zone");
        
        // Refresh token - nullable with expiration
        builder.Property(e => e.RefreshToken)
            .HasMaxLength(500);
        
        builder.Property(e => e.RefreshTokenExpiresAt)
            .HasColumnType("timestamp with time zone");
        
        // Claims as JSON array
        builder.Property(e => e.Claims)
            .HasConversion(
                v => JsonSerializer.Serialize(v, (JsonSerializerOptions?)null),
                v => JsonSerializer.Deserialize<List<string>>(v, (JsonSerializerOptions?)null) ?? new List<string>())
            .HasColumnType("jsonb")
            .HasDefaultValueSql("'[]'::jsonb");
        
        // Indexes for performance
        builder.HasIndex(e => e.Role)
            .HasDatabaseName("IX_AdminUsers_Role");
        
        builder.HasIndex(e => e.IsActive)
            .HasDatabaseName("IX_AdminUsers_IsActive");
        
        builder.HasIndex(e => e.RefreshToken)
            .HasDatabaseName("IX_AdminUsers_RefreshToken")
            .HasFilter("\"RefreshToken\" IS NOT NULL");
        
        builder.HasIndex(e => e.CreatedAt)
            .HasDatabaseName("IX_AdminUsers_CreatedAt");
    }
}