using System;

namespace SC.WorkLog.Domain.ValueObjects
{
    public class AuditInfo
    {
        public string CreatedBy { get; private set; }
        public string LastUpdatedBy { get; private set; }
        public DateTime CreatedOn { get; private set; }
        public DateTime LastUpdatedOn { get; private set; }

        public AuditInfo(string username)
        {
            CreatedBy = username;
            CreatedOn = DateTime.UtcNow;
            LastUpdatedBy = username;
            LastUpdatedOn = DateTime.UtcNow;
        }

        public void Update(string username)
        {
            LastUpdatedOn = DateTime.UtcNow;
            LastUpdatedBy = username;
        }
    }
}
