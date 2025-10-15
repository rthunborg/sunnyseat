using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace SunnySeat.Data;

/// <summary>
/// Design-time factory for SunnySeatDbContext to support EF migrations
/// </summary>
public class SunnySeatDbContextFactory : IDesignTimeDbContextFactory<SunnySeatDbContext>
{
    public SunnySeatDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<SunnySeatDbContext>();
        
        // Use default connection string for migrations
        // This will be overridden in production via DI
        optionsBuilder.UseNpgsql(
            "Host=localhost;Database=sunnyseat_dev;Username=postgres;Password=postgres",
            options => options.UseNetTopologySuite()
        );

        return new SunnySeatDbContext(optionsBuilder.Options);
    }
}