using System;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using MongoDB.Driver;
using SC.WorkLog.Common.Settings;
using SC.WorkLog.Domain.Interfaces;

namespace SC.WorkLog.Infrastructure.Repository
{
    public static class MongoPersistenceExtensions
    {
        public static void AddMongoPersistence(this IServiceCollection services)
        {
            services.AddSingleton<PrepareDatabase>();
            services.AddSingleton<IMongoClient>(serviceProvider =>
            {
                serviceProvider.GetRequiredService<PrepareDatabase>();

                var dbSettings = serviceProvider.GetRequiredService<IOptions<DbSettings>>().Value;
                if (string.IsNullOrWhiteSpace(dbSettings.DefaultConnection))
                    throw new InvalidOperationException("DbSettings.DefaultConnection is required.");

                var clientSettings = MongoClientSettings.FromConnectionString(dbSettings.DefaultConnection);
                return new MongoClient(clientSettings);
            });

            services.AddSingleton(serviceProvider =>
            {
                var dbSettings = serviceProvider.GetRequiredService<IOptions<DbSettings>>().Value;
                if (string.IsNullOrWhiteSpace(dbSettings.Database))
                    throw new InvalidOperationException("DbSettings.Database is required.");

                var client = serviceProvider.GetRequiredService<IMongoClient>();
                return client.GetDatabase(dbSettings.Database);
            });

            services.AddScoped(typeof(IRepository<>), typeof(Repository<>));
            services.AddScoped<WorkLogDatabaseIndexes>();
        }
    }
}
