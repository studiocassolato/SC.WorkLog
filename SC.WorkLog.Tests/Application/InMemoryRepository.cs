#nullable disable

using System.Linq.Expressions;
using SC.WorkLog.Domain;
using SC.WorkLog.Domain.Interfaces;

namespace SC.WorkLog.Tests.Application;

internal class InMemoryRepository<TEntity> : IRepository<TEntity> where TEntity : AggregateRoot
{
    public List<TEntity> Items { get; } = new();

    public Task DeleteMany(Expression<Func<TEntity, bool>> predicate)
    {
        Items.RemoveAll(x => predicate.Compile()(x));
        return Task.CompletedTask;
    }

    public Task Delete(TEntity entity)
    {
        Items.RemoveAll(x => x.Id == entity.Id);
        return Task.CompletedTask;
    }

    public Task<TEntity> GetSingleOrDefaultAsync(Expression<Func<TEntity, bool>> predicate)
    {
        return Task.FromResult(Items.SingleOrDefault(predicate.Compile()));
    }

    public Task<List<TEntity>> Get(Expression<Func<TEntity, bool>> predicate, int skip = -1, int take = -1, Expression<Func<TEntity, object>> sortOrder = null, bool sortDescending = false)
    {
        IEnumerable<TEntity> query = Items.Where(predicate.Compile());

        if (sortOrder != null)
            query = sortDescending ? query.OrderByDescending(sortOrder.Compile()) : query.OrderBy(sortOrder.Compile());

        if (skip >= 0)
            query = query.Skip(skip);

        if (take >= 0)
            query = query.Take(take);

        return Task.FromResult(query.ToList());
    }

    public Task InsertAsync(TEntity entity)
    {
        Items.Add(entity);
        return Task.CompletedTask;
    }

    public Task InsertMany(IEnumerable<TEntity> entities)
    {
        Items.AddRange(entities);
        return Task.CompletedTask;
    }

    public Task InsertOrReplace(TEntity entity)
    {
        Items.RemoveAll(x => x.Id == entity.Id);
        Items.Add(entity);
        return Task.CompletedTask;
    }

    public Task<long> GetCount(Expression<Func<TEntity, bool>> predicate)
    {
        return Task.FromResult((long)Items.Count(predicate.Compile()));
    }

    public Task CreateIndex(string indexPath)
    {
        return Task.CompletedTask;
    }

    public Task CreateCompoundIndex(bool unique, params string[] indexPaths)
    {
        return Task.CompletedTask;
    }
}
