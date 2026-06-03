using System;
using SC.WorkLog.Domain.ValueObjects;

namespace SC.WorkLog.Domain
{
    public abstract class AggregateRoot
    {
        public Guid Id { get; private set; }
        public AuditInfo AuditInfo { get; internal set; }

        protected AggregateRoot()
        {
            Id = Guid.NewGuid();
        }

        public bool IsTransient()
        {
            return Id == default(Guid);
        }

        public override bool Equals(object obj)
        {
            var compareTo = obj as AggregateRoot;

            if (ReferenceEquals(compareTo, null))
                return false;

            if (ReferenceEquals(this, compareTo))
                return true;

            if (GetType() != compareTo.GetType())
                return false;

            return !IsTransient() && !compareTo.IsTransient() && Id == compareTo.Id;
        }

        public override int GetHashCode()
        {
            return Id.GetHashCode();
        }

        public static bool operator ==(AggregateRoot left, AggregateRoot right)
        {
            if (ReferenceEquals(left, null) && ReferenceEquals(right, null))
                return true;

            if (ReferenceEquals(left, null) || ReferenceEquals(right, null))
                return false;

            return left.Equals(right);
        }

        public static bool operator !=(AggregateRoot left, AggregateRoot right)
        {
            return !(left == right);
        }
    }
}
