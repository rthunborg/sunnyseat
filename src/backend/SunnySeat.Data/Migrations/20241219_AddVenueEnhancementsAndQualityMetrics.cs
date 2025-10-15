using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace SunnySeat.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddVenueEnhancementsAndQualityMetrics : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Add new columns to venues table
            migrationBuilder.AddColumn<string>(
                name: "Phone",
                table: "venues",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Website",
                table: "venues",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Type",
                table: "venues",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<bool>(
                name: "IsMapped",
                table: "venues",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            // Add new columns to patios table
            migrationBuilder.AddColumn<decimal>(
                name: "HeightM",
                table: "patios",
                type: "numeric(5,2)",
                precision: 5,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "HeightSource",
                table: "patios",
                type: "integer",
                nullable: false,
                defaultValue: 2); // Heuristic

            migrationBuilder.AddColumn<string>(
                name: "Orientation",
                table: "patios",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);

            // Update default quality score
            migrationBuilder.AlterColumn<double>(
                name: "PolygonQuality",
                table: "patios",
                type: "numeric(3,2)",
                precision: 3,
                scale: 2,
                nullable: false,
                defaultValue: 0.5,
                oldClrType: typeof(double),
                oldType: "numeric(3,2)",
                oldPrecision: 3,
                oldScale: 2,
                oldDefaultValue: 1.0);

            // Update ReviewNeeded default
            migrationBuilder.AlterColumn<bool>(
                name: "ReviewNeeded",
                table: "patios",
                type: "boolean",
                nullable: false,
                defaultValue: true,
                oldClrType: typeof(bool),
                oldType: "boolean",
                oldDefaultValue: false);

            // Create VenueQualityMetrics table
            migrationBuilder.CreateTable(
                name: "venue_quality_metrics",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    VenueId = table.Column<int>(type: "integer", nullable: false),
                    OverallQuality = table.Column<decimal>(type: "numeric(3,2)", precision: 3, scale: 2, nullable: false),
                    HasCompleteMetadata = table.Column<bool>(type: "boolean", nullable: false),
                    HasAccurateLocation = table.Column<bool>(type: "boolean", nullable: false),
                    HasQualityPatios = table.Column<bool>(type: "boolean", nullable: false),
                    PatioCount = table.Column<int>(type: "integer", nullable: false),
                    AveragePatioQuality = table.Column<decimal>(type: "numeric(3,2)", precision: 3, scale: 2, nullable: false),
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

            // Create new indexes for venues
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

            // Create new indexes for patios
            migrationBuilder.CreateIndex(
                name: "IX_patios_HeightSource",
                table: "patios",
                column: "HeightSource");

            migrationBuilder.CreateIndex(
                name: "IX_patios_PolygonQuality",
                table: "patios",
                column: "PolygonQuality");

            // Create indexes for venue quality metrics
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
            // Drop venue quality metrics table
            migrationBuilder.DropTable(
                name: "venue_quality_metrics");

            // Drop new indexes
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

            // Remove new columns from venues
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

            // Remove new columns from patios
            migrationBuilder.DropColumn(
                name: "HeightM",
                table: "patios");

            migrationBuilder.DropColumn(
                name: "HeightSource",
                table: "patios");

            migrationBuilder.DropColumn(
                name: "Orientation",
                table: "patios");

            // Revert patios column changes
            migrationBuilder.AlterColumn<bool>(
                name: "ReviewNeeded",
                table: "patios",
                type: "boolean",
                nullable: false,
                defaultValue: false,
                oldClrType: typeof(bool),
                oldType: "boolean",
                oldDefaultValue: true);

            migrationBuilder.AlterColumn<double>(
                name: "PolygonQuality",
                table: "patios",
                type: "numeric(3,2)",
                precision: 3,
                scale: 2,
                nullable: false,
                defaultValue: 1.0,
                oldClrType: typeof(double),
                oldType: "numeric(3,2)",
                oldPrecision: 3,
                oldScale: 2,
                oldDefaultValue: 0.5);
        }
    }
}