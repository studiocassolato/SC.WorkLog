using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using SC.WorkLog.Application;
using SC.WorkLog.Application.DTO.Common;
using SC.WorkLog.Application.Services;
using SC.WorkLog.Common.Settings;
using SC.WorkLog.Domain.AggregateRoots;
using SC.WorkLog.Domain.Enums;
using SC.WorkLog.Domain.Interfaces;
using SC.WorkLog.Infrastructure.Repository;

namespace SC.WorkLog.ConsoleTester
{
    internal static class Program
    {
        private const string AdminEmail = "nicola@studiocassolato.it";
        private const string SeedUser = "console-seed";
        private const string EnsureDefaultStatusesCommand = "EnsureDefaultStatuses";

        private static async Task Main(string[] args)
        {
            var environmentName = Environment.GetEnvironmentVariable("DOTNET_ENVIRONMENT") ?? "Development";
            var configuration = BuildConfiguration(environmentName);
            var services = new ServiceCollection();

            services.AddLogging(builder => builder.AddConsole());
            services.AddApplicationServices(configuration);

            using (var serviceProvider = services.BuildServiceProvider())
            using (var scope = serviceProvider.CreateScope())
            {
                if (args.Length > 0 && string.Equals(args[0], EnsureDefaultStatusesCommand, StringComparison.OrdinalIgnoreCase))
                    await EnsureDefaultStatuses(scope.ServiceProvider);
                else
                    await SeedAdminUser(scope.ServiceProvider);
            }

            Console.WriteLine($"ConsoleTester completed. Environment: {environmentName}.");
        }

        private static IConfiguration BuildConfiguration(string environmentName)
        {
            return new ConfigurationBuilder()
                .SetBasePath(AppContext.BaseDirectory)
                .AddJsonFile("appsettings.json", optional: false)
                .AddJsonFile($"appsettings.{environmentName}.json", optional: true)
                .Build();
        }

        private static async Task SeedAdminUser(IServiceProvider serviceProvider)
        {
            var employees = serviceProvider.GetRequiredService<IRepository<Employee>>();
            var users = serviceProvider.GetRequiredService<IRepository<WorkLogUser>>();

            var employee = await employees.GetSingleOrDefaultAsync(x => x.Email == AdminEmail);
            if (employee == null)
            {
                employee = new Employee("Nicola", "Cassolato", AdminEmail, EmployeeLevel.Senior, 1, 8, SeedUser);
                await employees.InsertAsync(employee);
                Console.WriteLine($"Created employee {AdminEmail}.");
            }
            else if (!employee.Active)
            {
                employee.Update(employee.FirstName, employee.LastName, employee.Email, employee.Level, employee.DefaultHourlyRate, employee.ExpectedDailyHours, true, SeedUser);
                await employees.InsertOrReplace(employee);
                Console.WriteLine($"Reactivated employee {AdminEmail}.");
            }

            var user = await users.GetSingleOrDefaultAsync(x => x.Email == AdminEmail);
            var seedCognitoSub = $"seed:{AdminEmail}";
            if (user == null)
            {
                user = new WorkLogUser(AdminEmail, seedCognitoSub, WorkLogUserType.Employee, WorkLogUserRole.Admin, employee.Id, null, "Nicola Cassolato", SeedUser);
                await users.InsertAsync(user);
                Console.WriteLine($"Created admin WorkLog user {AdminEmail}.");
                return;
            }

            user.Update(AdminEmail, string.IsNullOrWhiteSpace(user.CognitoSub) ? seedCognitoSub : user.CognitoSub, WorkLogUserType.Employee, WorkLogUserRole.Admin, employee.Id, null, string.IsNullOrWhiteSpace(user.DisplayName) ? "Nicola Cassolato" : user.DisplayName, true, SeedUser);
            await users.InsertOrReplace(user);
            Console.WriteLine($"Updated admin WorkLog user {AdminEmail}.");
        }

        private static async Task EnsureDefaultStatuses(IServiceProvider serviceProvider)
        {
            var dbSettings = serviceProvider.GetRequiredService<IOptions<DbSettings>>().Value;
            var statusConfigs = serviceProvider.GetRequiredService<IRepository<StatusConfig>>();
            var indexes = serviceProvider.GetRequiredService<WorkLogDatabaseIndexes>();
            var service = serviceProvider.GetRequiredService<StatusConfigService>();
            var defaultKeys = StatusConfigService.GetDefaultStatusKeys();

            Console.WriteLine($"Database: {dbSettings.Database}");
            await indexes.EnsureCreatedAsync();
            Console.WriteLine("Indexes ensured.");

            var existing = await statusConfigs.Get(x => true);
            var existingDefaultKeys = existing
                .Where(x => defaultKeys.Contains(x.Key))
                .Select(x => x.Key)
                .Distinct()
                .OrderBy(x => x)
                .ToList();
            var missingKeys = defaultKeys
                .Where(key => !existingDefaultKeys.Contains(key))
                .ToList();

            Console.WriteLine($"Default statuses already existing: {existingDefaultKeys.Count}");
            Console.WriteLine($"Missing default keys: {FormatKeys(missingKeys)}");

            try
            {
                var ensuredStatuses = await service.EnsureDefaultStatuses(AdminContext());
                var hasActiveNew = ensuredStatuses.Any(x => x.Active && x.Typology == WorkItemStatusTypology.New);
                var hasActiveClosed = ensuredStatuses.Any(x => x.Active && (x.Typology == WorkItemStatusTypology.Closed || x.Typology == WorkItemStatusTypology.Archived));

                if (!hasActiveNew)
                    Console.WriteLine("WARNING: no active New status exists.");
                if (!hasActiveClosed)
                    Console.WriteLine("WARNING: no active closed typology status exists.");

                Console.WriteLine($"Statuses created: {missingKeys.Count}");
                Console.WriteLine($"Created keys: {FormatKeys(missingKeys)}");
                Console.WriteLine(hasActiveNew && hasActiveClosed ? "Validation result: passed." : "Validation result: failed.");
            }
            catch (ArgumentException exception)
            {
                var currentStatuses = await statusConfigs.Get(x => true);
                if (!currentStatuses.Any(x => x.Active && x.Typology == WorkItemStatusTypology.New))
                    Console.WriteLine("WARNING: no active New status exists.");
                if (!currentStatuses.Any(x => x.Active && (x.Typology == WorkItemStatusTypology.Closed || x.Typology == WorkItemStatusTypology.Archived)))
                    Console.WriteLine("WARNING: no active closed typology status exists.");
                Console.WriteLine("Statuses created: 0");
                Console.WriteLine("Created keys: (none)");
                Console.WriteLine($"Validation result: failed. {exception.Message}");
                throw;
            }
        }

        private static WorkLogUserContext AdminContext()
        {
            return new WorkLogUserContext
            {
                Email = SeedUser,
                Role = ApplicationUserRole.Admin
            };
        }

        private static string FormatKeys(IEnumerable<string> keys)
        {
            var list = keys.ToList();
            return list.Any() ? string.Join(", ", list) : "(none)";
        }
    }
}
