using System;
using System.Collections.Generic;
using System.Linq.Expressions;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using MongoDB.Driver;
using SC.WorkLog.Common.Settings;
using SC.WorkLog.Domain;
using SC.WorkLog.Domain.Interfaces;

namespace SC.WorkLog.Infrastructure.Repository
{
    public class Repository<TEntity> : IRepository<TEntity> where TEntity : AggregateRoot
    {
        private readonly IMongoCollection<TEntity> _collection;
        private readonly ILogger<Repository<TEntity>> _logger;

        public Repository(
            IOptions<DbSettings> settings,
            ILogger<Repository<TEntity>> logger,
            PrepareDatabase prepareDatabase)
        {
            _logger = logger;

            var client = new MongoClient(settings.Value.DefaultConnection);
            var database = client.GetDatabase(settings.Value.Database);
            _collection = database.GetCollection<TEntity>(typeof(TEntity).Name);
        }

        public async Task DeleteMany(Expression<Func<TEntity, bool>> predicate)
        {
            await _collection.DeleteManyAsync(predicate);
        }

        public async Task Delete(TEntity entity)
        {
            await _collection.DeleteOneAsync(x => x.Id == entity.Id);
        }

        public async Task<TEntity> GetSingleOrDefaultAsync(Expression<Func<TEntity, bool>> predicate)
        {
            return await _collection.Find(predicate).SingleOrDefaultAsync();
        }

        public async Task<List<TEntity>> Get(Expression<Func<TEntity, bool>> predicate, int skip = -1, int take = -1, Expression<Func<TEntity, object>> sortOrder = null, bool sortDescending = false)
        {
            var query = _collection.Find(predicate);

            if (sortOrder != null)
                query = sortDescending ? query.SortByDescending(sortOrder) : query.SortBy(sortOrder);

            if (skip >= 0)
                query = query.Skip(skip);

            if (take >= 0)
                query = query.Limit(take);

            return await query.ToListAsync();
        }

        public async Task InsertAsync(TEntity entity)
        {
            await _collection.InsertOneAsync(entity);
        }

        public async Task InsertMany(IEnumerable<TEntity> entities)
        {
            await _collection.InsertManyAsync(entities);
        }

        public async Task InsertOrReplace(TEntity entity)
        {
            await _collection.ReplaceOneAsync(x => x.Id == entity.Id, entity, new ReplaceOptions { IsUpsert = true });
        }

        public async Task<long> GetCount(Expression<Func<TEntity, bool>> predicate)
        {
            return await _collection.CountDocumentsAsync(predicate);
        }

        public async Task CreateIndex(string indexPath)
        {
            _logger.LogInformation("Creating index {IndexPath} on {Collection}", indexPath, typeof(TEntity).Name);

            var indexKeys = Builders<TEntity>.IndexKeys.Ascending(indexPath);
            await _collection.Indexes.CreateOneAsync(new CreateIndexModel<TEntity>(indexKeys));
        }

        public async Task CreateCompoundIndex(bool unique, params string[] indexPaths)
        {
            var indexKeys = Builders<TEntity>.IndexKeys.Ascending(indexPaths[0]);

            for (var i = 1; i < indexPaths.Length; i++)
                indexKeys = indexKeys.Ascending(indexPaths[i]);

            await _collection.Indexes.CreateOneAsync(new CreateIndexModel<TEntity>(indexKeys, new CreateIndexOptions { Unique = unique }));
        }
    }
}
