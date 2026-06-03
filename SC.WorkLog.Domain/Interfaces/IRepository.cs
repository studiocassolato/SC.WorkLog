using System;
using System.Collections.Generic;
using System.Linq.Expressions;
using System.Threading.Tasks;

namespace SC.WorkLog.Domain.Interfaces
{
    public interface IRepository<TEntity> where TEntity : AggregateRoot
    {
        Task DeleteMany(Expression<Func<TEntity, bool>> predicate);
        Task Delete(TEntity entity);
        Task<TEntity> GetSingleOrDefaultAsync(Expression<Func<TEntity, bool>> predicate);
        Task<List<TEntity>> Get(Expression<Func<TEntity, bool>> predicate, int skip = -1, int take = -1, Expression<Func<TEntity, object>> sortOrder = null, bool sortDescending = false);
        Task InsertAsync(TEntity entity);
        Task InsertMany(IEnumerable<TEntity> entities);
        Task InsertOrReplace(TEntity entity);
        Task<long> GetCount(Expression<Func<TEntity, bool>> predicate);
        Task CreateIndex(string indexPath);
        Task CreateCompoundIndex(bool unique, params string[] indexPaths);
    }
}
