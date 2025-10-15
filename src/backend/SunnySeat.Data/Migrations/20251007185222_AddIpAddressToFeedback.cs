using System;
using Microsoft.EntityFrameworkCore.Migrations;
using NetTopologySuite.Geometries;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace SunnySeat.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddIpAddressToFeedback : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_buildings_ExternalId",
                table: "buildings");

            migrationBuilder.RenameIndex(
                name: "IX_buildings_Source",
                table: "buildings",
                newName: "IX_Buildings_Source");

            migrationBuilder.RenameIndex(
                name: "IX_buildings_Geometry",
                table: "buildings",
                newName: "IX_Buildings_Geometry_Spatial");

            migrationBuilder.AddColumn<bool>(
                name: "IsMapped",
                table: "venues",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "Phone",
                table: "venues",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Type",
                table: "venues",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "Website",
                table: "venues",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "AverageExposurePercent",
                table: "sun_windows",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<int>(
                name: "DataPointCount",
                table: "sun_windows",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "sun_windows",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<bool>(
                name: "IsRecommended",
                table: "sun_windows",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "LocalEndTime",
                table: "sun_windows",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<DateTime>(
                name: "LocalPeakExposureTime",
                table: "sun_windows",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<DateTime>(
                name: "LocalStartTime",
                table: "sun_windows",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<double>(
                name: "MaxExposurePercent",
                table: "sun_windows",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<double>(
                name: "MinExposurePercent",
                table: "sun_windows",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<DateTime>(
                name: "PeakExposureTime",
                table: "sun_windows",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<double>(
                name: "PriorityScore",
                table: "sun_windows",
                type: "double precision",
                nullable: false,
                defaultValue: 0.0);

            migrationBuilder.AddColumn<int>(
                name: "Quality",
                table: "sun_windows",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "RecommendationReason",
                table: "sun_windows",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AlterColumn<int>(
                name: "HeightSource",
                table: "patios",
                type: "integer",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20);

            migrationBuilder.AddColumn<double>(
                name: "HeightM",
                table: "patios",
                type: "double precision",
                precision: 5,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Orientation",
                table: "patios",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "IpAddress",
                table: "feedback",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<double>(
                name: "AdminHeightOverride",
                table: "buildings",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "BuildingType",
                table: "buildings",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<double>(
                name: "HeightM",
                table: "buildings",
                type: "double precision",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "HeightSource",
                table: "buildings",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "UpdatedBy",
                table: "buildings",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "admin_users",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Username = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    Email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    PasswordHash = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    Role = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false, defaultValue: "Admin"),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    LastLoginAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Claims = table.Column<string>(type: "jsonb", nullable: false, defaultValueSql: "'[]'::jsonb"),
                    RefreshToken = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    RefreshTokenExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_admin_users", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "precomputation_schedules",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    TargetDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Status = table.Column<int>(type: "integer", nullable: false),
                    ScheduledAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    StartedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CompletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    PatiosProcessed = table.Column<int>(type: "integer", nullable: false),
                    PatiosTotal = table.Column<int>(type: "integer", nullable: false),
                    ErrorMessage = table.Column<string>(type: "text", nullable: true),
                    Metrics = table.Column<string>(type: "text", nullable: false),
                    JobId = table.Column<string>(type: "text", nullable: true),
                    RetryCount = table.Column<int>(type: "integer", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_precomputation_schedules", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "precomputed_sun_exposure",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PatioId = table.Column<int>(type: "integer", nullable: false),
                    Timestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    LocalTime = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    Date = table.Column<DateOnly>(type: "date", nullable: false),
                    Time = table.Column<TimeOnly>(type: "time without time zone", nullable: false),
                    SunExposurePercent = table.Column<double>(type: "double precision", nullable: false),
                    State = table.Column<int>(type: "integer", nullable: false),
                    Confidence = table.Column<double>(type: "double precision", nullable: false),
                    CompressedSunlitGeometry = table.Column<byte[]>(type: "bytea", nullable: true),
                    SunlitAreaSqM = table.Column<double>(type: "double precision", nullable: false),
                    ShadedAreaSqM = table.Column<double>(type: "double precision", nullable: false),
                    SolarElevation = table.Column<double>(type: "double precision", nullable: false),
                    SolarAzimuth = table.Column<double>(type: "double precision", nullable: false),
                    AffectingBuildingsCount = table.Column<int>(type: "integer", nullable: false),
                    CalculationDuration = table.Column<TimeSpan>(type: "interval", nullable: false),
                    ComputedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    ComputationVersion = table.Column<string>(type: "text", nullable: false),
                    IsStale = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_precomputed_sun_exposure", x => x.Id);
                    table.ForeignKey(
                        name: "FK_precomputed_sun_exposure_patios_PatioId",
                        column: x => x.PatioId,
                        principalTable: "patios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "processed_weather",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    WeatherSliceId = table.Column<int>(type: "integer", nullable: false),
                    Timestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    NormalizedCloudCover = table.Column<double>(type: "double precision", precision: 5, scale: 2, nullable: false),
                    PrecipitationIntensity = table.Column<double>(type: "double precision", precision: 5, scale: 2, nullable: false),
                    Condition = table.Column<int>(type: "integer", nullable: false),
                    IsSunBlocking = table.Column<bool>(type: "boolean", nullable: false),
                    ConfidenceLevel = table.Column<double>(type: "double precision", precision: 3, scale: 2, nullable: false),
                    Location = table.Column<Point>(type: "geography (point)", nullable: true),
                    ProcessedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_processed_weather", x => x.Id);
                    table.ForeignKey(
                        name: "FK_processed_weather_weather_slices_WeatherSliceId",
                        column: x => x.WeatherSliceId,
                        principalTable: "weather_slices",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "venue_quality_metrics",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    VenueId = table.Column<int>(type: "integer", nullable: false),
                    OverallQuality = table.Column<double>(type: "double precision", precision: 3, scale: 2, nullable: false),
                    HasCompleteMetadata = table.Column<bool>(type: "boolean", nullable: false),
                    HasAccurateLocation = table.Column<bool>(type: "boolean", nullable: false),
                    HasQualityPatios = table.Column<bool>(type: "boolean", nullable: false),
                    PatioCount = table.Column<int>(type: "integer", nullable: false),
                    AveragePatioQuality = table.Column<double>(type: "double precision", precision: 3, scale: 2, nullable: false),
                    ValidationIssues = table.Column<string>(type: "text", nullable: false),
                    AssessedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_venue_quality_metrics", x => x.Id);
                    table.ForeignKey(
                        name: "FK_venue_quality_metrics_venues_VenueId",
                        column: x => x.VenueId,
                        principalTable: "venues",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_venues_IsMapped",
                table: "venues",
                column: "IsMapped");

            migrationBuilder.CreateIndex(
                name: "IX_venues_Name",
                table: "venues",
                column: "Name");

            migrationBuilder.CreateIndex(
                name: "IX_venues_Type",
                table: "venues",
                column: "Type");

            migrationBuilder.CreateIndex(
                name: "IX_patios_HeightSource",
                table: "patios",
                column: "HeightSource");

            migrationBuilder.CreateIndex(
                name: "IX_patios_PolygonQuality",
                table: "patios",
                column: "PolygonQuality");

            migrationBuilder.CreateIndex(
                name: "IX_Buildings_CreatedAt",
                table: "buildings",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Buildings_ExternalId_Source",
                table: "buildings",
                columns: new[] { "ExternalId", "Source" },
                filter: "\"ExternalId\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_AdminUsers_CreatedAt",
                table: "admin_users",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_AdminUsers_Email",
                table: "admin_users",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AdminUsers_IsActive",
                table: "admin_users",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_AdminUsers_RefreshToken",
                table: "admin_users",
                column: "RefreshToken",
                filter: "\"RefreshToken\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_AdminUsers_Role",
                table: "admin_users",
                column: "Role");

            migrationBuilder.CreateIndex(
                name: "IX_AdminUsers_Username",
                table: "admin_users",
                column: "Username",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_precomputation_schedules_Status",
                table: "precomputation_schedules",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_precomputation_schedules_Status_TargetDate",
                table: "precomputation_schedules",
                columns: new[] { "Status", "TargetDate" });

            migrationBuilder.CreateIndex(
                name: "IX_precomputation_schedules_TargetDate",
                table: "precomputation_schedules",
                column: "TargetDate",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_precomputed_sun_exposure_Date",
                table: "precomputed_sun_exposure",
                column: "Date");

            migrationBuilder.CreateIndex(
                name: "IX_precomputed_sun_exposure_Date_PatioId",
                table: "precomputed_sun_exposure",
                columns: new[] { "Date", "PatioId" });

            migrationBuilder.CreateIndex(
                name: "IX_precomputed_sun_exposure_ExpiresAt",
                table: "precomputed_sun_exposure",
                column: "ExpiresAt");

            migrationBuilder.CreateIndex(
                name: "IX_precomputed_sun_exposure_IsStale",
                table: "precomputed_sun_exposure",
                column: "IsStale");

            migrationBuilder.CreateIndex(
                name: "IX_precomputed_sun_exposure_PatioId_Date_Time",
                table: "precomputed_sun_exposure",
                columns: new[] { "PatioId", "Date", "Time" });

            migrationBuilder.CreateIndex(
                name: "IX_processed_weather_Location",
                table: "processed_weather",
                column: "Location")
                .Annotation("Npgsql:IndexMethod", "gist");

            migrationBuilder.CreateIndex(
                name: "IX_processed_weather_ProcessedAt",
                table: "processed_weather",
                column: "ProcessedAt");

            migrationBuilder.CreateIndex(
                name: "IX_processed_weather_Timestamp",
                table: "processed_weather",
                column: "Timestamp");

            migrationBuilder.CreateIndex(
                name: "IX_processed_weather_Timestamp_IsSunBlocking",
                table: "processed_weather",
                columns: new[] { "Timestamp", "IsSunBlocking" });

            migrationBuilder.CreateIndex(
                name: "IX_processed_weather_WeatherSliceId",
                table: "processed_weather",
                column: "WeatherSliceId");

            migrationBuilder.CreateIndex(
                name: "IX_venue_quality_metrics_AssessedAt",
                table: "venue_quality_metrics",
                column: "AssessedAt");

            migrationBuilder.CreateIndex(
                name: "IX_venue_quality_metrics_OverallQuality",
                table: "venue_quality_metrics",
                column: "OverallQuality");

            migrationBuilder.CreateIndex(
                name: "IX_venue_quality_metrics_VenueId",
                table: "venue_quality_metrics",
                column: "VenueId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "admin_users");

            migrationBuilder.DropTable(
                name: "precomputation_schedules");

            migrationBuilder.DropTable(
                name: "precomputed_sun_exposure");

            migrationBuilder.DropTable(
                name: "processed_weather");

            migrationBuilder.DropTable(
                name: "venue_quality_metrics");

            migrationBuilder.DropIndex(
                name: "IX_venues_IsMapped",
                table: "venues");

            migrationBuilder.DropIndex(
                name: "IX_venues_Name",
                table: "venues");

            migrationBuilder.DropIndex(
                name: "IX_venues_Type",
                table: "venues");

            migrationBuilder.DropIndex(
                name: "IX_patios_HeightSource",
                table: "patios");

            migrationBuilder.DropIndex(
                name: "IX_patios_PolygonQuality",
                table: "patios");

            migrationBuilder.DropIndex(
                name: "IX_Buildings_CreatedAt",
                table: "buildings");

            migrationBuilder.DropIndex(
                name: "IX_Buildings_ExternalId_Source",
                table: "buildings");

            migrationBuilder.DropColumn(
                name: "IsMapped",
                table: "venues");

            migrationBuilder.DropColumn(
                name: "Phone",
                table: "venues");

            migrationBuilder.DropColumn(
                name: "Type",
                table: "venues");

            migrationBuilder.DropColumn(
                name: "Website",
                table: "venues");

            migrationBuilder.DropColumn(
                name: "AverageExposurePercent",
                table: "sun_windows");

            migrationBuilder.DropColumn(
                name: "DataPointCount",
                table: "sun_windows");

            migrationBuilder.DropColumn(
                name: "Description",
                table: "sun_windows");

            migrationBuilder.DropColumn(
                name: "IsRecommended",
                table: "sun_windows");

            migrationBuilder.DropColumn(
                name: "LocalEndTime",
                table: "sun_windows");

            migrationBuilder.DropColumn(
                name: "LocalPeakExposureTime",
                table: "sun_windows");

            migrationBuilder.DropColumn(
                name: "LocalStartTime",
                table: "sun_windows");

            migrationBuilder.DropColumn(
                name: "MaxExposurePercent",
                table: "sun_windows");

            migrationBuilder.DropColumn(
                name: "MinExposurePercent",
                table: "sun_windows");

            migrationBuilder.DropColumn(
                name: "PeakExposureTime",
                table: "sun_windows");

            migrationBuilder.DropColumn(
                name: "PriorityScore",
                table: "sun_windows");

            migrationBuilder.DropColumn(
                name: "Quality",
                table: "sun_windows");

            migrationBuilder.DropColumn(
                name: "RecommendationReason",
                table: "sun_windows");

            migrationBuilder.DropColumn(
                name: "HeightM",
                table: "patios");

            migrationBuilder.DropColumn(
                name: "Orientation",
                table: "patios");

            migrationBuilder.DropColumn(
                name: "IpAddress",
                table: "feedback");

            migrationBuilder.DropColumn(
                name: "AdminHeightOverride",
                table: "buildings");

            migrationBuilder.DropColumn(
                name: "BuildingType",
                table: "buildings");

            migrationBuilder.DropColumn(
                name: "HeightM",
                table: "buildings");

            migrationBuilder.DropColumn(
                name: "HeightSource",
                table: "buildings");

            migrationBuilder.DropColumn(
                name: "UpdatedBy",
                table: "buildings");

            migrationBuilder.RenameIndex(
                name: "IX_Buildings_Source",
                table: "buildings",
                newName: "IX_buildings_Source");

            migrationBuilder.RenameIndex(
                name: "IX_Buildings_Geometry_Spatial",
                table: "buildings",
                newName: "IX_buildings_Geometry");

            migrationBuilder.AlterColumn<string>(
                name: "HeightSource",
                table: "patios",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer");

            migrationBuilder.CreateIndex(
                name: "IX_buildings_ExternalId",
                table: "buildings",
                column: "ExternalId");
        }
    }
}
