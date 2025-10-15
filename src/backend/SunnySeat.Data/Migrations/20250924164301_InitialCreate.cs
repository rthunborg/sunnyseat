using System;
using Microsoft.EntityFrameworkCore.Migrations;
using NetTopologySuite.Geometries;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace SunnySeat.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:PostgresExtension:postgis", ",,");

            migrationBuilder.CreateTable(
                name: "buildings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Geometry = table.Column<Polygon>(type: "geography (polygon)", nullable: false),
                    Height = table.Column<double>(type: "double precision", precision: 6, scale: 2, nullable: false),
                    Source = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    QualityScore = table.Column<double>(type: "double precision", precision: 3, scale: 2, nullable: false),
                    ExternalId = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_buildings", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "venues",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Address = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Location = table.Column<Point>(type: "geography (point)", nullable: false),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_venues", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "weather_slices",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Timestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CloudCover = table.Column<double>(type: "double precision", precision: 5, scale: 2, nullable: false),
                    PrecipitationProbability = table.Column<double>(type: "double precision", precision: 3, scale: 2, nullable: false),
                    Temperature = table.Column<double>(type: "double precision", precision: 4, scale: 1, nullable: false),
                    Visibility = table.Column<double>(type: "double precision", precision: 5, scale: 2, nullable: true),
                    IsForecast = table.Column<bool>(type: "boolean", nullable: false),
                    Source = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_weather_slices", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "patios",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    VenueId = table.Column<int>(type: "integer", nullable: false),
                    Name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    Geometry = table.Column<Polygon>(type: "geography (polygon)", nullable: false),
                    PolygonQuality = table.Column<double>(type: "double precision", precision: 3, scale: 2, nullable: false),
                    HeightSource = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    ReviewNeeded = table.Column<bool>(type: "boolean", nullable: false),
                    Notes = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_patios", x => x.Id);
                    table.ForeignKey(
                        name: "FK_patios_venues_VenueId",
                        column: x => x.VenueId,
                        principalTable: "venues",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "feedback",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PatioId = table.Column<int>(type: "integer", nullable: false),
                    VenueId = table.Column<int>(type: "integer", nullable: false),
                    UserTimestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    PredictedState = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    ConfidenceAtPrediction = table.Column<double>(type: "double precision", precision: 3, scale: 2, nullable: false),
                    WasSunny = table.Column<bool>(type: "boolean", nullable: false),
                    BinnedTimestamp = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_feedback", x => x.Id);
                    table.ForeignKey(
                        name: "FK_feedback_patios_PatioId",
                        column: x => x.PatioId,
                        principalTable: "patios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_feedback_venues_VenueId",
                        column: x => x.VenueId,
                        principalTable: "venues",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "sun_windows",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PatioId = table.Column<int>(type: "integer", nullable: false),
                    Date = table.Column<DateOnly>(type: "date", nullable: false),
                    StartTime = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    EndTime = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    PeakExposure = table.Column<double>(type: "double precision", precision: 3, scale: 2, nullable: false),
                    Confidence = table.Column<double>(type: "double precision", precision: 3, scale: 2, nullable: false),
                    CalculatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP")
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_sun_windows", x => x.Id);
                    table.ForeignKey(
                        name: "FK_sun_windows_patios_PatioId",
                        column: x => x.PatioId,
                        principalTable: "patios",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_buildings_ExternalId",
                table: "buildings",
                column: "ExternalId");

            migrationBuilder.CreateIndex(
                name: "IX_buildings_Geometry",
                table: "buildings",
                column: "Geometry")
                .Annotation("Npgsql:IndexMethod", "gist");

            migrationBuilder.CreateIndex(
                name: "IX_buildings_Source",
                table: "buildings",
                column: "Source");

            migrationBuilder.CreateIndex(
                name: "IX_feedback_BinnedTimestamp",
                table: "feedback",
                column: "BinnedTimestamp");

            migrationBuilder.CreateIndex(
                name: "IX_feedback_PatioId_BinnedTimestamp",
                table: "feedback",
                columns: new[] { "PatioId", "BinnedTimestamp" });

            migrationBuilder.CreateIndex(
                name: "IX_feedback_VenueId_UserTimestamp",
                table: "feedback",
                columns: new[] { "VenueId", "UserTimestamp" });

            migrationBuilder.CreateIndex(
                name: "IX_patios_Geometry",
                table: "patios",
                column: "Geometry")
                .Annotation("Npgsql:IndexMethod", "gist");

            migrationBuilder.CreateIndex(
                name: "IX_patios_ReviewNeeded",
                table: "patios",
                column: "ReviewNeeded");

            migrationBuilder.CreateIndex(
                name: "IX_patios_VenueId",
                table: "patios",
                column: "VenueId");

            migrationBuilder.CreateIndex(
                name: "IX_sun_windows_Date",
                table: "sun_windows",
                column: "Date");

            migrationBuilder.CreateIndex(
                name: "IX_sun_windows_PatioId_Date",
                table: "sun_windows",
                columns: new[] { "PatioId", "Date" });

            migrationBuilder.CreateIndex(
                name: "IX_sun_windows_StartTime",
                table: "sun_windows",
                column: "StartTime");

            migrationBuilder.CreateIndex(
                name: "IX_venues_IsActive",
                table: "venues",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "IX_venues_Location",
                table: "venues",
                column: "Location")
                .Annotation("Npgsql:IndexMethod", "gist");

            migrationBuilder.CreateIndex(
                name: "IX_weather_slices_IsForecast",
                table: "weather_slices",
                column: "IsForecast");

            migrationBuilder.CreateIndex(
                name: "IX_weather_slices_Source_Timestamp",
                table: "weather_slices",
                columns: new[] { "Source", "Timestamp" });

            migrationBuilder.CreateIndex(
                name: "IX_weather_slices_Timestamp",
                table: "weather_slices",
                column: "Timestamp");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "buildings");

            migrationBuilder.DropTable(
                name: "feedback");

            migrationBuilder.DropTable(
                name: "sun_windows");

            migrationBuilder.DropTable(
                name: "weather_slices");

            migrationBuilder.DropTable(
                name: "patios");

            migrationBuilder.DropTable(
                name: "venues");
        }
    }
}
