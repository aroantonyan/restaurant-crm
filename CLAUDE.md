# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Restaurant CRM — SaaS backend for restaurant management, delivered as a Telegram Mini App. Staff (waiter, cook, bartender, cashier, manager) each get role-specific views. Built with ASP.NET Core 9, PostgreSQL, SignalR. Targeting Armenian market.

## Common Commands

```bash
# Build
dotnet build Solution1.sln

# Run the API
dotnet run --project RestaurantCRM.API

# Add EF migration
dotnet ef migrations add <MigrationName> --project RestaurantCRM.Infrastructure --startup-project RestaurantCRM.API

# Apply migrations
dotnet ef database update --project RestaurantCRM.Infrastructure --startup-project RestaurantCRM.API
```

## Solution Structure

```
RestaurantCRM.Domain/          # Entities, enums — no external dependencies
RestaurantCRM.Application/     # Use cases, DTOs, interfaces (references Domain)
RestaurantCRM.Infrastructure/  # EF Core, PostgreSQL, JWT, SignalR impl (references Application)
RestaurantCRM.API/             # ASP.NET Core endpoints, hubs, middleware (references Infrastructure + Application)
```

Reference flow: `API → Infrastructure → Application → Domain`

## Architecture Notes

**Multi-tenancy:** Row-level. Every entity that belongs to a restaurant implements `ITenantEntity` (carries `RestaurantId`). EF Core global query filters on `RestaurantId` auto-scope all queries — populated from the JWT claim via `ITenantContext`.

**Auth:** JWT tokens. Accounts created by the Admin; new users start in `PendingPasswordChange` status and must set their own password on first login. `TelegramUserId` on `User` links Telegram identity.

**Permissions:** `PermissionType` enum covers all features. Roles store a set of `RolePermission` rows. Default roles (Admin, Manager, Waiter, Cook, Bartender, Cashier) are seeded per restaurant on creation.

**Real-time:** SignalR `OrderHub` — clients join a group by `restaurantId`. Key events: `OrderItemSent`, `OrderItemStatusChanged`, `TableStatusChanged`, `InventoryAlert`.

## Domain Entities (current)

| Entity | Location |
|---|---|
| `BaseEntity` | `Domain/Common/` — Guid Id, CreatedAt, UpdatedAt |
| `ITenantEntity` | `Domain/Common/` — RestaurantId marker |
| `Restaurant` | `Domain/Entities/` — tenant root |
| `User` | `Domain/Entities/` — staff member, links to Role |
| `Role` | `Domain/Entities/` — per-restaurant, has permissions |
| `RolePermission` | `Domain/Entities/` — join: Role ↔ PermissionType |
| `PermissionType` | `Domain/Enums/` — all feature flags as enum |
| `UserStatus` | `Domain/Enums/` — Active, Inactive, PendingPasswordChange |
