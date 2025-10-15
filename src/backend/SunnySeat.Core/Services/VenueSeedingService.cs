using Microsoft.Extensions.Logging;
using NetTopologySuite.Geometries;
using SunnySeat.Core.Entities;
using SunnySeat.Core.Interfaces;

namespace SunnySeat.Core.Services;

/// <summary>
/// Service for seeding initial venue data for Gothenburg
/// </summary>
public class VenueSeedingService
{
    private readonly IVenueService _venueService;
    private readonly ILogger<VenueSeedingService> _logger;

    public VenueSeedingService(IVenueService venueService, ILogger<VenueSeedingService> logger)
    {
        _venueService = venueService;
        _logger = logger;
    }

    /// <summary>
    /// Seeds the database with initial Gothenburg venue data
    /// </summary>
    public async Task<int> SeedVenuesAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var venues = GetGothenburgVenues();
            var importedCount = await _venueService.ImportVenuesAsync(venues, cancellationToken);
            
            _logger.LogInformation("Successfully seeded {Count} venues", importedCount);
            return importedCount;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error seeding venues");
            throw;
        }
    }

    /// <summary>
    /// Gets a curated list of Gothenburg venues with outdoor seating
    /// </summary>
    private List<Venue> GetGothenburgVenues()
    {
        return new List<Venue>
        {
            // CENTRUM - Downtown area
            CreateVenue("Café Husaren", "Långgatan 32, Göteborg", 11.9516, 57.7089, VenueType.Cafe, "031-123456", "https://cafehusaren.se"),
            CreateVenue("Restaurant Heaven 23", "Klarabergsgatan 23, Göteborg", 11.9537, 57.7125, VenueType.Restaurant, "031-789012", "https://heaven23.se"),
            CreateVenue("Bar Pigalle", "Avenyn 8, Göteborg", 11.9591, 57.7035, VenueType.Bar, "031-345678"),
            CreateVenue("Hotel Gothia Towers - Terrace", "Mässans gata 24, Göteborg", 11.9423, 57.7067, VenueType.Hotel, "031-901234", "https://gothitowers.com"),
            CreateVenue("Café Magasinet", "Tredje Långgatan 10, Göteborg", 11.9503, 57.7098, VenueType.Cafe),
            CreateVenue("Restaurant Sjöbaren", "Klippgatan 8, Göteborg", 11.9548, 57.7142, VenueType.Restaurant, "031-567890"),
            CreateVenue("Brewdog Göteborg", "Kungsgatan 7, Göteborg", 11.9705, 57.7086, VenueType.Bar, "031-234567", "https://brewdog.com"),
            CreateVenue("Restaurant 28+", "Götabergsgatan 28, Göteborg", 11.9614, 57.7037, VenueType.Restaurant, "031-678901", "https://28plus.se"),

            // HAGA - Historic district
            CreateVenue("Café Haga Nygata", "Haga Nygata 25, Göteborg", 11.9537, 57.7004, VenueType.Cafe, "031-456789"),
            CreateVenue("Restaurant Solrosen", "Kaponjärgatan 4A, Göteborg", 11.9526, 57.7015, VenueType.Restaurant),
            CreateVenue("Café da Matteo", "Victoriapassagen, Göteborg", 11.9548, 57.7021, VenueType.Cafe, "031-890123", "https://damatteo.se"),
            CreateVenue("Hagabullen Café", "Haga Nygata 35, Göteborg", 11.9531, 57.6998, VenueType.Cafe),
            CreateVenue("Restaurant Koka", "Viktoriagatan 12, Göteborg", 11.9567, 57.7018, VenueType.Restaurant, "031-345123", "https://kokarestaurant.se"),

            // LINNÉSTADEN - Trendy area
            CreateVenue("Café Linnéa", "Linnégatan 18, Göteborg", 11.9746, 57.6952, VenueType.Cafe),
            CreateVenue("Restaurant Puta Madre", "Folkungagatan 8, Göteborg", 11.9731, 57.6963, VenueType.Restaurant, "031-567234"),
            CreateVenue("Bar Bellman", "Bellmansgatan 2, Göteborg", 11.9756, 57.6941, VenueType.Bar),
            CreateVenue("Restaurant Dubbel Dubbel", "Linnégatan 21, Göteborg", 11.9739, 57.6958, VenueType.Restaurant, "031-789456"),
            CreateVenue("Café Tabac", "Aschebergsgatan 23, Göteborg", 11.9681, 57.6934, VenueType.Cafe),
            CreateVenue("Restaurant Yuc", "Viktoriagatan 3, Göteborg", 11.9723, 57.6976, VenueType.Restaurant, "031-234789"),

            // MAJORNA - Waterfront area
            CreateVenue("Café Kronhuset", "Kronhusgatan 1, Göteborg", 11.9587, 57.7089, VenueType.Cafe),
            CreateVenue("Restaurant Fiskekrogen", "Lilla Torget 1, Göteborg", 11.9583, 57.7081, VenueType.Restaurant, "031-456012", "https://fiskekrogen.se"),
            CreateVenue("Bar Oceanen", "Klippgatan 15, Göteborg", 11.9542, 57.7156, VenueType.Bar),
            CreateVenue("Restaurant Thörnströms Kök", "Teknologgatan 3, Göteborg", 11.9398, 57.7123, VenueType.Restaurant, "031-678345", "https://thornstromskök.com"),

            // VASASTAN - Mixed area
            CreateVenue("Café Vasastan", "Vasagatan 45, Göteborg", 11.9789, 57.7012, VenueType.Cafe),
            CreateVenue("Restaurant AG", "Trekansgatan 1, Göteborg", 11.9834, 57.7045, VenueType.Restaurant, "031-890567", "https://ag.restaurant"),
            CreateVenue("Bar Pustervik", "Järntorgsgatan 12, Göteborg", 11.9623, 57.7042, VenueType.Bar, "031-012678"),
            CreateVenue("Restaurant Dorsia", "Avenyn 27, Göteborg", 11.9589, 57.7028, VenueType.Restaurant, "031-234901", "https://dorsia.se"),

            // ADDITIONAL VENUES for variety
            CreateVenue("Café Maggan", "Magasinsgatan 6, Göteborg", 11.9654, 57.7067, VenueType.Cafe),
            CreateVenue("Restaurant Upper House", "Lilla Bommen 5, Göteborg", 11.9612, 57.7156, VenueType.Restaurant, "031-567012", "https://upperhouse.se"),
            CreateVenue("Bar Sticky Fingers", "Kaserntorget 7, Göteborg", 11.9673, 57.7089, VenueType.Bar),
            CreateVenue("Café Lilla London", "Tredje Långgatan 18, Göteborg", 11.9489, 57.7102, VenueType.Cafe),
            CreateVenue("Restaurant Bhoga", "Norra Hamngatan 10, Göteborg", 11.9634, 57.7089, VenueType.Restaurant, "031-789234", "https://bhoga.se"),
            CreateVenue("Hotel Elite Plaza - Rooftop", "Västra Hamngatan 3, Göteborg", 11.9687, 57.7067, VenueType.Hotel, "031-345567"),

            // GÖTAPLATSEN area
            CreateVenue("Café Opera", "Götaplatsen, Göteborg", 11.9789, 57.6945, VenueType.Cafe),
            CreateVenue("Restaurant Familjen", "Arkivgatan 7, Göteborg", 11.9812, 57.6934, VenueType.Restaurant, "031-456890"),
            CreateVenue("Bar Sticky Fingers Götaplatsen", "Götaplatsen 2, Göteborg", 11.9798, 57.6952, VenueType.Bar),

            // ADDITIONAL CAFES
            CreateVenue("Café String", "Norra Larmgatan 14, Göteborg", 11.9734, 57.7078, VenueType.Cafe),
            CreateVenue("Bean Around The World", "Linnégatan 8, Göteborg", 11.9751, 57.6967, VenueType.Cafe, "031-678123"),
            CreateVenue("Café Kuriosa", "Västra Hamngatan 14, Göteborg", 11.9698, 57.7062, VenueType.Cafe),
            CreateVenue("Café Kringlan", "Södra Vägen 45, Göteborg", 11.9867, 57.6923, VenueType.Cafe),

            // SPECIALTY VENUES
            CreateVenue("Brewhouse & Kitchen", "Kungsportsplatsen 2, Göteborg", 11.9712, 57.7067, VenueType.Other, "031-890345"),
            CreateVenue("Food Court Nordstan", "Nordstadstorget, Göteborg", 11.9687, 57.7089, VenueType.Other),
            CreateVenue("Market Hall Saluhallen", "Kungstorget, Göteborg", 11.9654, 57.7078, VenueType.Other),

            // ADDITIONAL RESTAURANTS
            CreateVenue("Restaurant Toso", "Linnégatan 23, Göteborg", 11.9742, 57.6956, VenueType.Restaurant, "031-234456"),
            CreateVenue("Restaurant Indien", "Kapellgränd 4, Göteborg", 11.9567, 57.7034, VenueType.Restaurant),
            CreateVenue("Restaurant Magnus & Magnus", "Magasinsgatan 8, Göteborg", 11.9651, 57.7065, VenueType.Restaurant, "031-567789"),
            CreateVenue("Restaurant Atelier", "Götabergsgatan 36, Göteborg", 11.9623, 57.7031, VenueType.Restaurant, "031-890012"),

            // BARS AND PUBS
            CreateVenue("The Rover", "Mölndalsvägen 23, Göteborg", 11.9834, 57.6912, VenueType.Bar),
            CreateVenue("Ölstugan Tullen", "Stigbergsliden 10, Göteborg", 11.9456, 57.7123, VenueType.Bar, "031-123789"),
            CreateVenue("Bar Kino", "Bergsjöns Gata 8, Göteborg", 11.9723, 57.7045, VenueType.Bar),

            // WATERFRONT VENUES
            CreateVenue("Restaurant Sjömagasinet", "Klippgatan 5, Göteborg", 11.9545, 57.7148, VenueType.Restaurant, "031-456234", "https://sjomagasinet.se"),
            CreateVenue("Café Lagunen", "Stenpiren 1, Göteborg", 11.9598, 57.7156, VenueType.Cafe),
            CreateVenue("Restaurant Kust", "Klippgatan 12, Göteborg", 11.9541, 57.7151, VenueType.Restaurant, "031-789567")
        };
    }

    /// <summary>
    /// Helper method to create a venue with coordinates
    /// </summary>
    private Venue CreateVenue(string name, string address, double longitude, double latitude, 
                             VenueType type, string? phone = null, string? website = null)
    {
        return new Venue
        {
            Name = name,
            Address = address,
            Location = new Point(longitude, latitude) { SRID = 4326 },
            Type = type,
            Phone = phone,
            Website = website,
            IsActive = true,
            IsMapped = false, // Will be set to true when patios are added
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }
}