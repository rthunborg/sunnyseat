using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using NetTopologySuite.Geometries;
using SunnySeat.Core.Entities;
using SunnySeat.Core.Interfaces;

namespace SunnySeat.Data.Repositories;

/// <summary>
/// Repository for weather data persistence
/// </summary>
public class WeatherRepository : IWeatherRepository
{
    private readonly SunnySeatDbContext _context;
    private readonly ILogger<WeatherRepository> _logger;

    public WeatherRepository(
        SunnySeatDbContext context,
        ILogger<WeatherRepository> logger)
    {
        _context = context ?? throw new ArgumentNullException(nameof(context));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
    }

    /// <inheritdoc />
    public async Task AddWeatherDataAsync(WeatherSlice weatherSlice, CancellationToken cancellationToken = default)
    {
        try
        {
            _context.WeatherSlices.Add(weatherSlice);
            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogDebug("Added weather data for timestamp {Timestamp} from source {Source}",
                weatherSlice.Timestamp, weatherSlice.Source);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding weather data for timestamp {Timestamp}", weatherSlice.Timestamp);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task AddWeatherDataBatchAsync(IEnumerable<WeatherSlice> weatherSlices, CancellationToken cancellationToken = default)
    {
        try
        {
            var slicesList = weatherSlices.ToList();

            if (slicesList.Count == 0)
            {
                _logger.LogWarning("Attempted to add empty weather data batch");
                return;
            }

            _context.WeatherSlices.AddRange(slicesList);
            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Added batch of {Count} weather data entries", slicesList.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding weather data batch");
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<WeatherSlice?> GetLatestWeatherAsync(
        DateTime timestamp,
        CancellationToken cancellationToken = default)
    {
        try
        {
            // Get the most recent weather data before or at the requested timestamp
            var weather = await _context.WeatherSlices
                .Where(w => w.Timestamp <= timestamp)
                .OrderByDescending(w => w.Timestamp)
                .FirstOrDefaultAsync(cancellationToken);

            return weather;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving latest weather data for timestamp {Timestamp}", timestamp);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<WeatherSlice>> GetForecastDataAsync(
        DateTime startTime,
        DateTime endTime,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var forecasts = await _context.WeatherSlices
                .Where(w => w.Timestamp >= startTime && w.Timestamp <= endTime)
                .OrderBy(w => w.Timestamp)
                .ToListAsync(cancellationToken);

            return forecasts;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving forecast data between {StartTime} and {EndTime}", startTime, endTime);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task DeleteOldWeatherDataAsync(DateTime olderThan, CancellationToken cancellationToken = default)
    {
        try
        {
            var oldWeatherData = _context.WeatherSlices
                .Where(w => w.Timestamp < olderThan);

            var count = await oldWeatherData.CountAsync(cancellationToken);

            if (count > 0)
            {
                _context.WeatherSlices.RemoveRange(oldWeatherData);
                await _context.SaveChangesAsync(cancellationToken);

                _logger.LogInformation("Deleted {Count} old weather data entries older than {OlderThan}", count, olderThan);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting old weather data older than {OlderThan}", olderThan);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<int> GetWeatherDataCountAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            return await _context.WeatherSlices.CountAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error counting weather data entries");
            throw;
        }
    }

    #region ProcessedWeather Operations

    /// <inheritdoc />
    public async Task AddProcessedWeatherAsync(ProcessedWeather processedWeather, CancellationToken cancellationToken = default)
    {
        try
        {
            _context.ProcessedWeathers.Add(processedWeather);
            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogDebug("Added processed weather data for timestamp {Timestamp}",
                processedWeather.Timestamp);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding processed weather data for timestamp {Timestamp}",
                processedWeather.Timestamp);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task AddProcessedWeatherBatchAsync(
        IEnumerable<ProcessedWeather> processedWeathers,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var weatherList = processedWeathers.ToList();

            if (weatherList.Count == 0)
            {
                _logger.LogWarning("Attempted to add empty processed weather data batch");
                return;
            }

            _context.ProcessedWeathers.AddRange(weatherList);
            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogInformation("Added batch of {Count} processed weather entries", weatherList.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding processed weather data batch");
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<ProcessedWeather>> GetProcessedWeatherAsync(
        Point? location,
        DateTime startTime,
        DateTime endTime,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var query = _context.ProcessedWeathers
                .Include(pw => pw.WeatherSlice)
                .Where(pw => pw.Timestamp >= startTime && pw.Timestamp <= endTime);

            // If location is provided, filter by proximity (simple implementation)
            // For production, this could use PostGIS spatial queries
            if (location != null)
            {
                // For now, return all processed weather within time range
                // In a real implementation with spatial data, you'd filter by distance
                query = query.Where(pw => pw.Location != null);
            }

            var results = await query
                .OrderBy(pw => pw.Timestamp)
                .ToListAsync(cancellationToken);

            return results;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Error retrieving processed weather between {StartTime} and {EndTime}",
                startTime, endTime);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task<IReadOnlyList<ProcessedWeather>> GetProcessedWeatherByTimeRangeAsync(
        DateTime startTime,
        DateTime endTime,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var results = await _context.ProcessedWeathers
                .Include(pw => pw.WeatherSlice)
                .Where(pw => pw.Timestamp >= startTime && pw.Timestamp <= endTime)
                .OrderBy(pw => pw.Timestamp)
                .ToListAsync(cancellationToken);

            return results;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "Error retrieving processed weather by time range {StartTime} to {EndTime}",
                startTime, endTime);
            throw;
        }
    }

    /// <inheritdoc />
    public async Task DeleteOldProcessedWeatherAsync(DateTime olderThan, CancellationToken cancellationToken = default)
    {
        try
        {
            var oldProcessedWeather = _context.ProcessedWeathers
                .Where(pw => pw.Timestamp < olderThan);

            var count = await oldProcessedWeather.CountAsync(cancellationToken);

            if (count > 0)
            {
                _context.ProcessedWeathers.RemoveRange(oldProcessedWeather);
                await _context.SaveChangesAsync(cancellationToken);

                _logger.LogInformation(
                    "Deleted {Count} old processed weather entries older than {OlderThan}",
                    count, olderThan);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting old processed weather data older than {OlderThan}", olderThan);
            throw;
        }
    }

    #endregion
}
