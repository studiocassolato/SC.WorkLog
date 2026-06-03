using System;
using SC.WorkLog.Domain;

namespace SC.WorkLog.Tests.Domain;

public class AggregateRootTests
{
    [Fact]
    public void Constructor_AssignsNewGuid()
    {
        var aggregate = new TestAggregateRoot();

        Assert.NotEqual(Guid.Empty, aggregate.Id);
    }

    private class TestAggregateRoot : AggregateRoot
    {
    }
}
