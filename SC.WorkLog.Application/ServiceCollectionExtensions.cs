using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using SC.WorkLog.Application.EventHandlers;
using SC.WorkLog.Application.Services;
using SC.WorkLog.Common.Settings;
using SC.WorkLog.Domain.Interfaces;
using SC.WorkLog.Infrastructure.Repository;

namespace SC.WorkLog.Application
{
    public static class ServiceCollectionExtensions
    {
        public static void AddApplicationServices(this IServiceCollection services, IConfiguration configuration)
        {
            services.AddConfig(configuration);

            services.AddMongoPersistence();
            services.AddScoped<IEventDispatcher, EventDispatcher>();
            services.AddScoped<EmployeeService>();
            services.AddScoped<CustomerService>();
            services.AddScoped<ProjectService>();
            services.AddScoped<WorkItemService>();
            services.AddScoped<TimeEntryService>();
            services.AddScoped<LeaveRequestService>();
            services.AddScoped<OvertimeRequestService>();
            services.AddScoped<ProjectReportService>();
            services.AddScoped<TimeCompletenessService>();
            services.AddScoped<WorkLogUserService>();
            services.AddScoped<StatusConfigService>();
        }

        public static void AddApplicationPolicies(this IServiceCollection services)
        {
            services.AddAuthorization();
        }

        private static void AddConfig(this IServiceCollection services, IConfiguration configuration)
        {
            services.AddOptions();
            services.Configure<DbSettings>(configuration.GetSection(nameof(DbSettings)));
            services.Configure<CognitoSettings>(configuration.GetSection(nameof(CognitoSettings)));
            services.Configure<ServerSettings>(configuration.GetSection(nameof(ServerSettings)));
        }
    }
}
