using AspNetCoreRateLimit;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.ResponseCompression;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using NetTopologySuite;
using NetTopologySuite.Geometries;
using NetTopologySuite.IO;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;
using SunnySeat.Api.Endpoints;
using SunnySeat.Api.HealthChecks;
using SunnySeat.Api.Hubs;
using SunnySeat.Api.Middleware;
using SunnySeat.Api.Services;
using SunnySeat.Core.Interfaces;
using SunnySeat.Core.Services;
using SunnySeat.Data;
using SunnySeat.Data.Repositories;
using SunnySeat.Shared.Configuration;
using SunnySeat.Shared.Constants;
using System.IdentityModel.Tokens.Jwt;
using System.IO.Compression;
using System.Text;

// Disable default JWT claim type mapping (e.g., "role" -> "http://schemas.microsoft.com/ws/2008/06/identity/claims/role")
// This ensures JWT claims are used as-is without transformation
JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear();

var builder = WebApplication.CreateBuilder(args);

// Add services to the container
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo
    {
        Title = "SunnySeat API",
        Version = "v1",
        Description = "API for finding sunny outdoor seating locations with real-time sun exposure data",
        Contact = new Microsoft.OpenApi.Models.OpenApiContact
        {
            Name = "SunnySeat Team",
            Url = new Uri("https://github.com/sunnyseat/app")
        }
    });

    // Include XML documentation comments
    var xmlFilename = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFilename);
    if (File.Exists(xmlPath))
    {
        options.IncludeXmlComments(xmlPath);
    }

    // Add JWT authentication to Swagger UI
    options.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme. Enter 'Bearer' [space] and then your token in the text input below.",
        Name = "Authorization",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    options.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });
});

// Add response compression (gzip and brotli) for API responses
// Story 4.1 Task 7: Optimize bandwidth usage for patio search results
builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
    options.Providers.Add<BrotliCompressionProvider>();
    options.Providers.Add<GzipCompressionProvider>();
    // Compress JSON responses (API endpoints)
    options.MimeTypes = ResponseCompressionDefaults.MimeTypes.Concat(new[]
    {
        "application/json",
        "application/geo+json"
    });
});

builder.Services.Configure<BrotliCompressionProviderOptions>(options =>
{
    options.Level = CompressionLevel.Fastest; // Balance between compression ratio and CPU usage
});

builder.Services.Configure<GzipCompressionProviderOptions>(options =>
{
    options.Level = CompressionLevel.Fastest;
});

// Add controllers with Newtonsoft.Json configured for PostGIS and spatial data
builder.Services.AddControllers()
    .AddNewtonsoftJson(options =>
    {
        // Preserve property names as-is (PascalCase from C#)
        options.SerializerSettings.ContractResolver = new Newtonsoft.Json.Serialization.DefaultContractResolver();
        // Allow reading/writing enums as strings for better API clarity
        options.SerializerSettings.Converters.Add(new StringEnumConverter());
        // Add GeoJSON converter for NetTopologySuite geometries
        var geometryFactory = NtsGeometryServices.Instance.CreateGeometryFactory(srid: 4326);
        foreach (var converter in GeoJsonSerializer.Create(new GeometryFactory(new PrecisionModel(), 4326)).Converters)
        {
            options.SerializerSettings.Converters.Add(converter);
        }
        // Don't serialize null values to reduce payload size
        options.SerializerSettings.NullValueHandling = NullValueHandling.Ignore;
        // Handle reference loops
        options.SerializerSettings.ReferenceLoopHandling = ReferenceLoopHandling.Ignore;
    });

// Configure JSON for minimal APIs - must also use compatible settings
builder.Services.ConfigureHttpJsonOptions(options =>
{
    // Allow NaN and Infinity values for NetTopologySuite spatial types
    options.SerializerOptions.NumberHandling = System.Text.Json.Serialization.JsonNumberHandling.AllowNamedFloatingPointLiterals;
    options.SerializerOptions.DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
});

// Configure JWT options
builder.Services.Configure<JwtOptions>(builder.Configuration.GetSection(JwtOptions.SectionName));
var jwtOptions = builder.Configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>();

if (jwtOptions == null || !jwtOptions.IsValid)
{
    throw new InvalidOperationException("JWT configuration is missing or invalid. Please check appsettings.json");
}

// Add JWT Authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        var key = Encoding.ASCII.GetBytes(jwtOptions.SecretKey);
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(key),
            ValidateIssuer = true,
            ValidIssuer = jwtOptions.Issuer,
            ValidateAudience = true,
            ValidAudience = jwtOptions.Audience,
            ValidateLifetime = true,
            ClockSkew = TimeSpan.Zero,
            // Map role claim type to "role" (without namespace prefix)
            RoleClaimType = "role",
            NameClaimType = System.Security.Claims.ClaimTypes.Name
        };

        // Configure events for better error handling
        options.Events = new JwtBearerEvents
        {
            OnAuthenticationFailed = context =>
            {
                if (context.Exception.GetType() == typeof(SecurityTokenExpiredException))
                {
                    context.Response.Headers.Append("Token-Expired", "true");
                }
                return Task.CompletedTask;
            },
            OnChallenge = context =>
            {
                context.HandleResponse();
                context.Response.StatusCode = 401;
                context.Response.ContentType = "application/json";
                var result = System.Text.Json.JsonSerializer.Serialize(new
                {
                    error = "Unauthorized",
                    code = AuthErrorCodes.InvalidToken,
                    message = "Invalid or missing authentication token"
                });
                return context.Response.WriteAsync(result);
            },
            OnForbidden = context =>
            {
                context.Response.StatusCode = 403;
                context.Response.ContentType = "application/json";
                var result = System.Text.Json.JsonSerializer.Serialize(new
                {
                    error = "Forbidden",
                    code = AuthErrorCodes.InsufficientPermissions,
                    message = "Insufficient permissions for this operation"
                });
                return context.Response.WriteAsync(result);
            }
        };
    });

// Add Authorization with policies
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy(Policies.AdminOnly, policy =>
        policy.RequireAuthenticatedUser()
              .RequireClaim(System.Security.Claims.ClaimTypes.Role, Roles.Admin, Roles.SuperAdmin));

    options.AddPolicy(Policies.SuperAdminOnly, policy =>
        policy.RequireAuthenticatedUser()
              .RequireClaim(System.Security.Claims.ClaimTypes.Role, Roles.SuperAdmin));
});

// Add Entity Framework and PostgreSQL with PostGIS
builder.Services.AddDbContext<SunnySeatDbContext>(options =>
{
    var connectionString = builder.Configuration.GetConnectionString("DefaultConnection");
    options.UseNpgsql(connectionString, npgsqlOptions =>
    {
        npgsqlOptions.UseNetTopologySuite();
    });
});

// Add repositories
builder.Services.AddScoped<IAdminUserRepository, AdminUserRepository>();
builder.Services.AddScoped<IBuildingRepository, BuildingRepository>();
builder.Services.AddScoped<IVenueRepository, VenueRepository>();
builder.Services.AddScoped<IPatioRepository, PatioRepository>();
builder.Services.AddScoped<IWeatherRepository, WeatherRepository>();
builder.Services.AddScoped<IPrecomputationRepository, PrecomputationRepository>();
builder.Services.AddScoped<IFeedbackRepository, FeedbackRepository>();

// Add services
builder.Services.AddScoped<IAuthenticationService, AuthenticationService>();
builder.Services.AddScoped<IBuildingImportService, BuildingImportService>();
builder.Services.AddScoped<IDataQualityService, DataQualityService>();
builder.Services.AddScoped<IVenueService, VenueService>();
builder.Services.AddScoped<VenueSeedingService>();
builder.Services.AddScoped<VenueBuildingIntegrationService>();
builder.Services.AddScoped<ISolarCalculationService, SolarCalculationService>();

// Shadow and Sun Exposure services 
builder.Services.AddScoped<IShadowCalculationService, ShadowCalculationService>();
builder.Services.AddScoped<BuildingHeightManager>();
builder.Services.AddScoped<ISunExposureService, SunExposureService>();
builder.Services.AddScoped<ConfidenceCalculator>();


// Timeline and Forecast services (Story 2.5)
builder.Services.AddScoped<ISunTimelineService, SunTimelineService>();

// Accuracy Tracking and Feedback services (Story 3.5)
builder.Services.AddScoped<IAccuracyTrackingService, AccuracyTrackingService>();
builder.Services.AddScoped<IAlertingService, AlertingService>();
builder.Services.AddSingleton<IAccuracyMetricsBroadcaster, SignalRAccuracyMetricsBroadcaster>();

// Precomputation and Caching services (Story 2.4)
builder.Services.AddScoped<ICacheService, MultiLayerCacheService>();
builder.Services.AddScoped<IPrecomputationService, PrecomputationService>();

// Weather services (Story 3.1)
builder.Services.Configure<WeatherOptions>(builder.Configuration.GetSection(WeatherOptions.SectionName));

// Configure named HttpClients for weather services (improves testability)
builder.Services.AddHttpClient("MetNo")
    .ConfigureHttpClient(client =>
    {
        client.DefaultRequestHeaders.Add("User-Agent", "SunnySeat/1.0 (https://github.com/sunnyseat/app)");
        client.Timeout = TimeSpan.FromSeconds(30);
    });

builder.Services.AddHttpClient("OpenWeatherMap")
    .ConfigureHttpClient(client =>
    {
        client.Timeout = TimeSpan.FromSeconds(30);
    });

builder.Services.AddScoped<MetNoWeatherService>();
builder.Services.AddScoped<OpenWeatherMapService>();
builder.Services.AddScoped<IWeatherProcessingService, WeatherProcessingService>();
builder.Services.AddScoped<IWeatherRepository, WeatherRepository>();
builder.Services.AddHostedService<WeatherIngestionService>();
builder.Services.AddHostedService<AccuracyMetricsBackgroundService>();

// Add memory cache
builder.Services.AddMemoryCache();

// Add distributed cache (using in-memory for development/testing, Redis for production)
builder.Services.AddDistributedMemoryCache();
// For production: builder.Services.AddStackExchangeRedisCache(options => 
//     options.Configuration = builder.Configuration.GetConnectionString("Redis"));

// Configure IP rate limiting (Story 4.6)
builder.Services.AddOptions();
builder.Services.AddMemoryCache();
builder.Services.Configure<IpRateLimitOptions>(builder.Configuration.GetSection("IpRateLimiting"));
builder.Services.AddSingleton<IIpPolicyStore, MemoryCacheIpPolicyStore>();
builder.Services.AddSingleton<IRateLimitCounterStore, MemoryCacheRateLimitCounterStore>();
builder.Services.AddSingleton<IRateLimitConfiguration, RateLimitConfiguration>();
builder.Services.AddSingleton<IProcessingStrategy, AsyncKeyLockProcessingStrategy>();
builder.Services.AddInMemoryRateLimiting();

// Add NetTopologySuite geometry factory
builder.Services.AddSingleton<NetTopologySuite.Geometries.GeometryFactory>();

// Add SignalR for real-time updates
builder.Services.AddSignalR();

// Add basic health checks
builder.Services.AddHealthChecks()
    .AddCheck<WeatherServiceHealthCheck>("weather_service", tags: new[] { "weather", "api" });

// Add CORS (Story 4.6)
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();
        var allowedMethods = builder.Configuration.GetSection("Cors:AllowedMethods").Get<string[]>() ?? new[] { "GET", "POST", "OPTIONS" };
        var allowedHeaders = builder.Configuration.GetSection("Cors:AllowedHeaders").Get<string[]>() ?? new[] { "Content-Type", "Authorization" };
        var allowCredentials = builder.Configuration.GetValue<bool>("Cors:AllowCredentials", false);
        var maxAge = builder.Configuration.GetValue<int>("Cors:MaxAge", 3600);

        if (allowedOrigins.Length > 0)
        {
            policy.WithOrigins(allowedOrigins)
                  .WithMethods(allowedMethods)
                  .WithHeaders(allowedHeaders)
                  .SetPreflightMaxAge(TimeSpan.FromSeconds(maxAge));

            if (allowCredentials)
            {
                policy.AllowCredentials();
            }
        }
        else
        {
            // Development: allow localhost origins
            if (builder.Environment.IsDevelopment())
            {
                policy.WithOrigins("https://localhost:3000", "http://localhost:3000", "http://localhost:5173")
                      .AllowAnyMethod()
                      .AllowAnyHeader()
                      .AllowCredentials();
            }
        }
    });
});

// Configure SignalR CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("SignalRCorsPolicy", policy =>
    {
        var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? Array.Empty<string>();
        if (allowedOrigins.Length > 0)
        {
            policy.WithOrigins(allowedOrigins)
                  .AllowAnyMethod()
                  .AllowAnyHeader()
                  .AllowCredentials();
        }
        else if (builder.Environment.IsDevelopment())
        {
            policy.WithOrigins("https://localhost:3000", "http://localhost:3000")
                  .AllowAnyMethod()
                  .AllowAnyHeader()
                  .AllowCredentials();
        }
    });
});

var app = builder.Build();

// Configure the HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Response compression (Story 4.1 Task 7) - early in pipeline to compress all responses
app.UseResponseCompression();

// Security middleware pipeline (order matters!)
app.UseHttpsRedirection();
app.UseCors();

// Rate limiting middleware (Story 4.6) - before authentication
app.UseIpRateLimiting();

// Security headers middleware (Story 4.6)
app.UseMiddleware<SecurityHeadersMiddleware>();

// Authentication and authorization
app.UseAuthentication();
app.UseAuthorization();

// Health check endpoints
app.MapHealthChecks("/health");
app.MapGet("/health/ready", () => Results.Ok(new { status = "ready", timestamp = DateTime.UtcNow }))
    .WithName("HealthReady")
    .WithTags("Health")
    .AllowAnonymous();

app.MapGet("/health/live", () => Results.Ok(new { status = "live", timestamp = DateTime.UtcNow }))
    .WithName("HealthLive")
    .WithTags("Health")
    .AllowAnonymous();

// Database connectivity test endpoint
app.MapGet("/health/database", async (SunnySeatDbContext dbContext) =>
{
    try
    {
        await dbContext.Database.CanConnectAsync();
        return Results.Ok(new { status = "database_healthy", timestamp = DateTime.UtcNow });
    }
    catch (Exception ex)
    {
        return Results.Problem($"Database unhealthy: {ex.Message}");
    }
})
.WithName("HealthDatabase")
.WithTags("Health")
.AllowAnonymous();

// Map authentication endpoints
app.MapAuthEndpoints();

// Map protected admin endpoints
app.MapBuildingEndpoints();

// Map venue endpoints (NEW for Story 1.5)
app.MapGroup("/api/admin/venues")
   .WithTags("Admin Venues")
   .RequireAuthorization(Policies.AdminOnly)
   .MapVenuesApi();

// Map solar calculation endpoints (NEW for Story 2.1)
app.MapControllers(); // Enable controller mapping for SolarController

// Map patio search endpoints (Story 4.1)
app.MapGroup("/api/patios")
    .WithTags("Patios")
    .MapPatioApi();

// Map feedback and accuracy tracking endpoints (Story 3.5)
app.MapGroup("/api/feedback")
    .WithTags("Feedback & Accuracy")
    .MapFeedbackApi();

// Map SignalR hub for real-time accuracy metrics updates
app.MapHub<AccuracyMetricsHub>("/hubs/accuracy-metrics");

app.Run();

// Make Program class accessible for testing
public partial class Program { }
