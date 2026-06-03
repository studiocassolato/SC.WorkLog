using MongoDB.Bson;
using MongoDB.Bson.Serialization.Conventions;

namespace SC.WorkLog.Infrastructure.Repository
{
    public class PrepareDatabase
    {
        private static bool _configured;

        public PrepareDatabase()
        {
            if (_configured)
                return;

            var conventionPack = new ConventionPack
            {
                new EnumRepresentationConvention(BsonType.String),
                new IgnoreIfNullConvention(true)
            };

            ConventionRegistry.Register("WorkLogConventions", conventionPack, _ => true);
            _configured = true;
        }
    }
}
