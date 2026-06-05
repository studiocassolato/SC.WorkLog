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
using SC.WorkLog.Application.DTO.ExternalImport;
using SC.WorkLog.Application.Services;
using SC.WorkLog.Application.Services.ExternalImport;
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
        private const string ImportJiraSupportIssuesCommand = "ImportJiraSupportIssues";
        private const string ImportJiraSupportTempoWorklogsCommand = "ImportJiraSupportTempoWorklogs";

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
                if (args.Length > 0)
                {
                    if (string.Equals(args[0], EnsureDefaultStatusesCommand, StringComparison.OrdinalIgnoreCase))
                        await EnsureDefaultStatuses(scope.ServiceProvider);
                    else if (string.Equals(args[0], ImportJiraSupportIssuesCommand, StringComparison.OrdinalIgnoreCase))
                        await ImportJiraSupportIssues(scope.ServiceProvider, args.Skip(1).ToArray());
                    else if (string.Equals(args[0], ImportJiraSupportTempoWorklogsCommand, StringComparison.OrdinalIgnoreCase))
                        await ImportJiraSupportTempoWorklogs(scope.ServiceProvider, args.Skip(1).ToArray());
                    else
                        throw new ArgumentException($"Unknown command '{args[0]}'.");
                }
                else
                {
                    await SeedAdminUser(scope.ServiceProvider);
                }
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
            if (user == null)
            {
                user = new WorkLogUser(AdminEmail, WorkLogUserType.Employee, WorkLogUserRole.Admin, employee.Id, null, "Nicola Cassolato", SeedUser);
                await users.InsertAsync(user);
                Console.WriteLine($"Created admin WorkLog user {AdminEmail}.");
                return;
            }

            user.Update(AdminEmail, WorkLogUserType.Employee, WorkLogUserRole.Admin, employee.Id, null, string.IsNullOrWhiteSpace(user.DisplayName) ? "Nicola Cassolato" : user.DisplayName, true, SeedUser);
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

        private static async Task ImportJiraSupportIssues(IServiceProvider serviceProvider, string[] args)
        {
            var indexes = serviceProvider.GetRequiredService<WorkLogDatabaseIndexes>();
            var service = serviceProvider.GetRequiredService<JiraImportService>();
            await indexes.EnsureCreatedAsync();
            var result = await service.ImportSupportIssuesAsync(ParseImportOptions(args));
            PrintImportResult(result);
        }

        private static async Task ImportJiraSupportTempoWorklogs(IServiceProvider serviceProvider, string[] args)
        {
            var indexes = serviceProvider.GetRequiredService<WorkLogDatabaseIndexes>();
            var service = serviceProvider.GetRequiredService<JiraImportService>();
            await indexes.EnsureCreatedAsync();
            var result = await service.ImportSupportTempoWorklogsAsync(ParseImportOptions(args));
            PrintImportResult(result);
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

        private static ExternalImportOptions ParseImportOptions(string[] args)
        {
            var options = new ExternalImportOptions();
            for (var index = 0; index < args.Length; index++)
            {
                var arg = args[index];
                if (string.Equals(arg, "--full", StringComparison.OrdinalIgnoreCase))
                    options.Mode = ExternalImportMode.Full;
                else if (string.Equals(arg, "--update-only", StringComparison.OrdinalIgnoreCase))
                    options.Mode = ExternalImportMode.UpdateOnly;
                else if (string.Equals(arg, "--dry-run", StringComparison.OrdinalIgnoreCase))
                    options.DryRun = true;
                else if (string.Equals(arg, "--issue", StringComparison.OrdinalIgnoreCase))
                    options.IssueKey = ReadOptionValue(args, ref index, "--issue");
                else if (string.Equals(arg, "--max", StringComparison.OrdinalIgnoreCase))
                    options.Max = int.Parse(ReadOptionValue(args, ref index, "--max"));
                else if (string.Equals(arg, "--since", StringComparison.OrdinalIgnoreCase))
                    options.Since = DateTime.Parse(ReadOptionValue(args, ref index, "--since"));
                else
                    throw new ArgumentException($"Unknown option '{arg}'.");
            }
            return options;
        }

        private static string ReadOptionValue(string[] args, ref int index, string option)
        {
            if (index + 1 >= args.Length)
                throw new ArgumentException($"{option} requires a value.");
            index++;
            return args[index];
        }

        private static void PrintImportResult(ExternalImportResult result)
        {
            Console.WriteLine($"Source: {result.Source}");
            Console.WriteLine($"Project: {result.ProjectKey}");
            Console.WriteLine($"Mode: {result.Mode}");
            Console.WriteLine($"Dry-run: {result.DryRun}");
            Console.WriteLine($"Previous last successful sync: {FormatDate(result.PreviousLastSuccessfulSync)}");
            Console.WriteLine($"New last successful sync: {FormatDate(result.NewLastSuccessfulSync)}");
            Console.WriteLine($"Fetched: {result.TotalFetched}");
            Console.WriteLine($"Created: {result.CreatedCount}");
            Console.WriteLine($"Updated: {result.UpdatedCount}");
            Console.WriteLine($"Skipped: {result.SkippedCount}");
            Console.WriteLine($"Warnings: {result.Warnings.Count + result.UnmappedStatuses.Count + result.UnknownCustomers.Count + result.MissingDefaultProjects.Count + result.MissingEmployees.Count}");
            Console.WriteLine($"Errors: {result.ErrorCount}");
            Console.WriteLine($"Unmapped statuses: {result.UnmappedStatuses.Count}");
            Console.WriteLine($"Unknown customers: {result.UnknownCustomers.Count}");
            Console.WriteLine($"Missing default projects: {result.MissingDefaultProjects.Count}");
            Console.WriteLine($"Missing employees: {result.MissingEmployees.Count}");
            if (!string.IsNullOrWhiteSpace(result.RateLimitSummary))
                Console.WriteLine($"Rate limits: {result.RateLimitSummary}");
            PrintMessages("Warnings", result.Warnings);
            PrintMessages("Errors", result.Errors);
        }

        private static void PrintMessages(string title, IEnumerable<string> messages)
        {
            var list = messages.Distinct().Take(50).ToList();
            if (!list.Any())
                return;
            Console.WriteLine(title + ":");
            foreach (var message in list)
                Console.WriteLine($"- {message}");
        }

        private static string FormatDate(DateTime? value)
        {
            return value.HasValue ? value.Value.ToString("O") : "(none)";
        }
    }
}
