using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RestaurantCRM.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddVipTableFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsVip",
                table: "Tables",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<decimal>(
                name: "VipAmount",
                table: "Tables",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsVip",
                table: "Tables");

            migrationBuilder.DropColumn(
                name: "VipAmount",
                table: "Tables");
        }
    }
}
