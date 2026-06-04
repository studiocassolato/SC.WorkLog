using System;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using SC.WorkLog.Application;

namespace SC.WorkLog.QueueManager
{
    internal static class Program
    {
        private static void Main()
        {
            var environmentName = Environment.GetEnvironmentVariable("DOTNET_ENVIRONMENT") ?? "Development";
            var configuration = BuildConfiguration(environmentName);
            var services = new ServiceCollection();

            services.AddLogging(builder => builder.AddConsole());
            services.AddApplicationServices(configuration);

            using (services.BuildServiceProvider())
            {
                Console.WriteLine($"SC.WorkLog.QueueManager ready. Environment: {environmentName}.");
            }
        }

        private static IConfiguration BuildConfiguration(string environmentName)
        {
            return new ConfigurationBuilder()
                .SetBasePath(AppContext.BaseDirectory)
                .AddJsonFile("appsettings.json", optional: false)
                .AddJsonFile($"appsettings.{environmentName}.json", optional: true)
                .Build();
        }
    }
}
