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
            CreateVenue("Caf� Husaren", "L�nggatan 32, G�teborg", 11.9516, 57.7089, VenueType.Cafe, "031-123456", "https://cafehusaren.se"),
            CreateVenue("Restaurant Heaven 23", "Klarabergsgatan 23, G�teborg", 11.9537, 57.7125, VenueType.Restaurant, "031-789012", "https://heaven23.se"),
            CreateVenue("Bar Pigalle", "Avenyn 8, G�teborg", 11.9591, 57.7035, VenueType.Bar, "031-345678"),
            CreateVenue("Hotel Gothia Towers - Terrace", "M�ssans gata 24, G�teborg", 11.9423, 57.7067, VenueType.Hotel, "031-901234", "https://gothitowers.com"),
            CreateVenue("Caf� Magasinet", "Tredje L�nggatan 10, G�teborg", 11.9503, 57.7098, VenueType.Cafe),
            CreateVenue("Restaurant Sj�baren", "Klippgatan 8, G�teborg", 11.9548, 57.7142, VenueType.Restaurant, "031-567890"),
            CreateVenue("Brewdog G�teborg", "Kungsgatan 7, G�teborg", 11.9705, 57.7086, VenueType.Bar, "031-234567", "https://brewdog.com"),
            CreateVenue("Restaurant 28+", "G�tabergsgatan 28, G�teborg", 11.9614, 57.7037, VenueType.Restaurant, "031-678901", "https://28plus.se"),

            // HAGA - Historic district
            CreateVenue("Caf� Haga Nygata", "Haga Nygata 25, G�teborg", 11.9537, 57.7004, VenueType.Cafe, "031-456789"),
            CreateVenue("Restaurant Solrosen", "Kaponj�rgatan 4A, G�teborg", 11.9526, 57.7015, VenueType.Restaurant),
            CreateVenue("Caf� da Matteo", "Victoriapassagen, G�teborg", 11.9548, 57.7021, VenueType.Cafe, "031-890123", "https://damatteo.se"),
            CreateVenue("Hagabullen Caf�", "Haga Nygata 35, G�teborg", 11.9531, 57.6998, VenueType.Cafe),
            CreateVenue("Restaurant Koka", "Viktoriagatan 12, G�teborg", 11.9567, 57.7018, VenueType.Restaurant, "031-345123", "https://kokarestaurant.se"),

            // LINN�STADEN - Trendy area
            CreateVenue("Caf� Linn�a", "Linn�gatan 18, G�teborg", 11.9746, 57.6952, VenueType.Cafe),
            CreateVenue("Restaurant Puta Madre", "Folkungagatan 8, G�teborg", 11.9731, 57.6963, VenueType.Restaurant, "031-567234"),
            CreateVenue("Bar Bellman", "Bellmansgatan 2, G�teborg", 11.9756, 57.6941, VenueType.Bar),
            CreateVenue("Restaurant Dubbel Dubbel", "Linn�gatan 21, G�teborg", 11.9739, 57.6958, VenueType.Restaurant, "031-789456"),
            CreateVenue("Caf� Tabac", "Aschebergsgatan 23, G�teborg", 11.9681, 57.6934, VenueType.Cafe),
            CreateVenue("Restaurant Yuc", "Viktoriagatan 3, G�teborg", 11.9723, 57.6976, VenueType.Restaurant, "031-234789"),

            // MAJORNA - Waterfront area
            CreateVenue("Caf� Kronhuset", "Kronhusgatan 1, G�teborg", 11.9587, 57.7089, VenueType.Cafe),
            CreateVenue("Restaurant Fiskekrogen", "Lilla Torget 1, G�teborg", 11.9583, 57.7081, VenueType.Restaurant, "031-456012", "https://fiskekrogen.se"),
            CreateVenue("Bar Oceanen", "Klippgatan 15, G�teborg", 11.9542, 57.7156, VenueType.Bar),
            CreateVenue("Restaurant Th�rnstr�ms K�k", "Teknologgatan 3, G�teborg", 11.9398, 57.7123, VenueType.Restaurant, "031-678345", "https://thornstromsk�k.com"),

            // VASASTAN - Mixed area
            CreateVenue("Caf� Vasastan", "Vasagatan 45, G�teborg", 11.9789, 57.7012, VenueType.Cafe),
            CreateVenue("Restaurant AG", "Trekansgatan 1, G�teborg", 11.9834, 57.7045, VenueType.Restaurant, "031-890567", "https://ag.restaurant"),
            CreateVenue("Bar Pustervik", "J�rntorgsgatan 12, G�teborg", 11.9623, 57.7042, VenueType.Bar, "031-012678"),
            CreateVenue("Restaurant Dorsia", "Avenyn 27, G�teborg", 11.9589, 57.7028, VenueType.Restaurant, "031-234901", "https://dorsia.se"),

            // ADDITIONAL VENUES for variety
            CreateVenue("Caf� Maggan", "Magasinsgatan 6, G�teborg", 11.9654, 57.7067, VenueType.Cafe),
            CreateVenue("Restaurant Upper House", "Lilla Bommen 5, G�teborg", 11.9612, 57.7156, VenueType.Restaurant, "031-567012", "https://upperhouse.se"),
            CreateVenue("Bar Sticky Fingers", "Kaserntorget 7, G�teborg", 11.9673, 57.7089, VenueType.Bar),
            CreateVenue("Caf� Lilla London", "Tredje L�nggatan 18, G�teborg", 11.9489, 57.7102, VenueType.Cafe),
            CreateVenue("Restaurant Bhoga", "Norra Hamngatan 10, G�teborg", 11.9634, 57.7089, VenueType.Restaurant, "031-789234", "https://bhoga.se"),
            CreateVenue("Hotel Elite Plaza - Rooftop", "V�stra Hamngatan 3, G�teborg", 11.9687, 57.7067, VenueType.Hotel, "031-345567"),

            // G�TAPLATSEN area
            CreateVenue("Caf� Opera", "G�taplatsen, G�teborg", 11.9789, 57.6945, VenueType.Cafe),
            CreateVenue("Restaurant Familjen", "Arkivgatan 7, G�teborg", 11.9812, 57.6934, VenueType.Restaurant, "031-456890"),
            CreateVenue("Bar Sticky Fingers G�taplatsen", "G�taplatsen 2, G�teborg", 11.9798, 57.6952, VenueType.Bar),

            // ADDITIONAL CAFES
            CreateVenue("Caf� String", "Norra Larmgatan 14, G�teborg", 11.9734, 57.7078, VenueType.Cafe),
            CreateVenue("Bean Around The World", "Linn�gatan 8, G�teborg", 11.9751, 57.6967, VenueType.Cafe, "031-678123"),
            CreateVenue("Caf� Kuriosa", "V�stra Hamngatan 14, G�teborg", 11.9698, 57.7062, VenueType.Cafe),
            CreateVenue("Caf� Kringlan", "S�dra V�gen 45, G�teborg", 11.9867, 57.6923, VenueType.Cafe),

            // SPECIALTY VENUES
            CreateVenue("Brewhouse & Kitchen", "Kungsportsplatsen 2, G�teborg", 11.9712, 57.7067, VenueType.Other, "031-890345"),
            CreateVenue("Food Court Nordstan", "Nordstadstorget, G�teborg", 11.9687, 57.7089, VenueType.Other),
            CreateVenue("Market Hall Saluhallen", "Kungstorget, G�teborg", 11.9654, 57.7078, VenueType.Other),

            // ADDITIONAL RESTAURANTS
            CreateVenue("Restaurant Toso", "Linn�gatan 23, G�teborg", 11.9742, 57.6956, VenueType.Restaurant, "031-234456"),
            CreateVenue("Restaurant Indien", "Kapellgr�nd 4, G�teborg", 11.9567, 57.7034, VenueType.Restaurant),
            CreateVenue("Restaurant Magnus & Magnus", "Magasinsgatan 8, G�teborg", 11.9651, 57.7065, VenueType.Restaurant, "031-567789"),
            CreateVenue("Restaurant Atelier", "G�tabergsgatan 36, G�teborg", 11.9623, 57.7031, VenueType.Restaurant, "031-890012"),

            // BARS AND PUBS
            CreateVenue("The Rover", "M�lndalsv�gen 23, G�teborg", 11.9834, 57.6912, VenueType.Bar),
            CreateVenue("�lstugan Tullen", "Stigbergsliden 10, G�teborg", 11.9456, 57.7123, VenueType.Bar, "031-123789"),
            CreateVenue("Bar Kino", "Bergsj�ns Gata 8, G�teborg", 11.9723, 57.7045, VenueType.Bar),

            // WATERFRONT VENUES
            CreateVenue("Restaurant Sj�magasinet", "Klippgatan 5, G�teborg", 11.9545, 57.7148, VenueType.Restaurant, "031-456234", "https://sjomagasinet.se"),
            CreateVenue("Caf� Lagunen", "Stenpiren 1, G�teborg", 11.9598, 57.7156, VenueType.Cafe),
            CreateVenue("Restaurant Kust", "Klippgatan 12, G�teborg", 11.9541, 57.7151, VenueType.Restaurant, "031-789567")
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