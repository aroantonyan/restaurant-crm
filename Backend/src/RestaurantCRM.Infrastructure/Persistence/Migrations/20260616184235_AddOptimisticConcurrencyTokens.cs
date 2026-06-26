using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RestaurantCRM.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddOptimisticConcurrencyTokens : Migration
    {
        // PostgreSQL exposes `xmin` as a system column on every table — it does NOT
        // need to be added with ALTER TABLE (in fact, doing so errors with
        // "column 'xmin' already exists"). Mapping it as an EF shadow row-version
        // is a model-metadata-only change: EF starts reading the value and adding
        // `WHERE xmin = @original` to UPDATE statements. The accompanying model
        // snapshot captures that mapping. Up/Down are intentionally empty.

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder) { }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder) { }
    }
}
