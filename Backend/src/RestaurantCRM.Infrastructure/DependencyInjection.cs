using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using RestaurantCRM.Application.ActivityLog;
using RestaurantCRM.Application.Auth;
using RestaurantCRM.Application.CashRegister;
using RestaurantCRM.Application.Clients;
using RestaurantCRM.Application.Common.Interfaces;
using RestaurantCRM.Application.Common.Settings;
using RestaurantCRM.Application.Inventory;
using RestaurantCRM.Application.Menu;
using RestaurantCRM.Application.Orders;
using RestaurantCRM.Application.Reports;
using RestaurantCRM.Application.Reservations;
using RestaurantCRM.Application.Restaurants;
using RestaurantCRM.Application.Schedule;
using RestaurantCRM.Application.Staff;
using RestaurantCRM.Application.Tables;
using RestaurantCRM.Infrastructure.Auth;
using RestaurantCRM.Infrastructure.Persistence;
using RestaurantCRM.Infrastructure.Realtime;
using RestaurantCRM.Infrastructure.Services;

namespace RestaurantCRM.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddHttpContextAccessor();

        services.Configure<JwtSettings>(configuration.GetSection("JwtSettings"));
        services.Configure<TelegramSettings>(configuration.GetSection("Telegram"));

        services.AddSingleton<ITelegramInitDataValidator, TelegramInitDataValidator>();

        services.AddScoped<ITenantContext, TenantContext>();
        services.AddScoped<JwtService>();
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IRestaurantService, RestaurantService>();
        services.AddScoped<IStaffService, StaffService>();
        services.AddScoped<IMenuService, MenuService>();
        services.AddScoped<ITableService, TableService>();
        services.AddScoped<IOrderService, OrderService>();
        services.AddScoped<IReservationService, ReservationService>();
        services.AddScoped<IInventoryService, InventoryService>();
        services.AddScoped<ICashRegisterService, CashRegisterService>();
        services.AddScoped<IClientService, ClientService>();
        services.AddScoped<IActivityLogService, ActivityLogService>();
        services.AddScoped<IScheduleService, ScheduleService>();
        services.AddScoped<IReportsService, ReportsService>();
        services.AddScoped<IRealtimeNotifier, RealtimeNotifier>();

        services.AddDbContext<AppDbContext>((serviceProvider, options) =>
        {
            options.UseNpgsql(configuration.GetConnectionString("DefaultConnection"));
        });

        var jwtSettings = configuration.GetSection("JwtSettings").Get<JwtSettings>()!;
        services
            .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = jwtSettings.Issuer,
                    ValidAudience = jwtSettings.Audience,
                    IssuerSigningKey = new SymmetricSecurityKey(
                        Encoding.UTF8.GetBytes(jwtSettings.Secret)),
                };

                // SignalR WebSockets can't send custom Authorization headers from the browser,
                // so the client passes the JWT as `?access_token=...` on the hub URL.
                options.Events = new JwtBearerEvents
                {
                    OnMessageReceived = ctx =>
                    {
                        var accessToken = ctx.Request.Query["access_token"];
                        var path = ctx.HttpContext.Request.Path;
                        if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))
                        {
                            ctx.Token = accessToken;
                        }
                        return Task.CompletedTask;
                    },
                };
            });

        services.AddAuthorization();

        return services;
    }
}
