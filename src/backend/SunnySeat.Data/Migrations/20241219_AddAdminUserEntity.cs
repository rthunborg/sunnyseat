using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace SunnySeat.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddAdminUserEntity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
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

            // Create default admin user
            migrationBuilder.Sql(@"
                INSERT INTO admin_users (Username, Email, PasswordHash, Role, IsActive, CreatedAt, LastLoginAt, Claims)
                VALUES (
                    'admin',
                    'admin@sunnyseat.local',
                    '$2a$12$XvXvYn3jMYx1X1X1X1X1X.X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1X1',
                    'SuperAdmin',
                    true,
                    CURRENT_TIMESTAMP,
                    '1970-01-01 00:00:00+00',
                    '[]'::jsonb
                );
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "admin_users");
        }
    }
}