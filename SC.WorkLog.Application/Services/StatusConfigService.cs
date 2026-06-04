using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using SC.WorkLog.Application.DTO.Common;
using SC.WorkLog.Application.DTO.StatusConfigs;
using SC.WorkLog.Application.Validation;
using SC.WorkLog.Domain.AggregateRoots;
using SC.WorkLog.Domain.Enums;
using SC.WorkLog.Domain.Interfaces;

namespace SC.WorkLog.Application.Services
{
    public class StatusConfigService
    {
        private readonly IRepository<StatusConfig> _statusConfigs;

        public StatusConfigService(IRepository<StatusConfig> statusConfigs)
        {
            _statusConfigs = statusConfigs;
        }

        public async Task<List<StatusConfigDto>> GetStatusConfigs()
        {
            var statuses = await _statusConfigs.Get(x => true, sortOrder: x => x.Order);
            return statuses.Select(Map).ToList();
        }

        public async Task<StatusConfigDto> CreateStatusConfig(CreateStatusConfigRequest request, WorkLogUserContext userContext)
        {
            WorkLogApplicationValidation.RequireAdmin(userContext, nameof(CreateStatusConfig));
            var key = StatusConfig.NormalizeKey(request.Key);
            StatusConfig.ValidateKey(key);
            ValidateRequest(request.Name, request.Typology, request.CustomerDisplayName, request.Order);
            await EnsureUniqueKey(key, null);
            await EnsureUniqueName(request.Name, null);

            var status = new StatusConfig(key, request.Name, request.Typology, request.CustomerDisplayName, request.Order, request.Active, CurrentUser(userContext));
            var existing = await _statusConfigs.Get(x => true);
            ValidateStatusSet(existing.Append(status));

            await _statusConfigs.InsertAsync(status);
            return Map(status);
        }

        public async Task<StatusConfigDto> UpdateStatusConfig(UpdateStatusConfigRequest request, WorkLogUserContext userContext)
        {
            WorkLogApplicationValidation.RequireAdmin(userContext, nameof(UpdateStatusConfig));
            WorkLogApplicationValidation.Required(request.Id, nameof(request.Id));
            ValidateRequest(request.Name, request.Typology, request.CustomerDisplayName, request.Order);
            await EnsureUniqueName(request.Name, request.Id);

            var status = await _statusConfigs.GetSingleOrDefaultAsync(x => x.Id == request.Id);
            if (status == null)
                throw new ArgumentException("Status config not found.");

            var existing = await _statusConfigs.Get(x => true);
            status.Update(request.Name, request.Typology, request.CustomerDisplayName, request.Order, request.Active, CurrentUser(userContext));
            ValidateStatusSet(existing.Where(x => x.Id != status.Id).Append(status));

            await _statusConfigs.InsertOrReplace(status);
            return Map(status);
        }

        public async Task<List<StatusConfigDto>> EnsureDefaultStatuses(WorkLogUserContext userContext)
        {
            WorkLogApplicationValidation.RequireAdmin(userContext, nameof(EnsureDefaultStatuses));
            var existing = await _statusConfigs.Get(x => true);
            var missingDefaults = DefaultStatuses()
                .Where(defaultStatus => !existing.Any(x => string.Equals(x.Key, defaultStatus.Key, StringComparison.Ordinal)))
                .Select(defaultStatus => new StatusConfig(defaultStatus.Key, defaultStatus.Name, defaultStatus.Typology, defaultStatus.CustomerDisplayName, defaultStatus.Order, true, CurrentUser(userContext)))
                .ToList();
            var finalStatuses = existing.Concat(missingDefaults).ToList();
            ValidateStatusSet(finalStatuses);

            if (missingDefaults.Any())
            {
                await _statusConfigs.InsertMany(missingDefaults);
                existing.AddRange(missingDefaults);
            }

            return existing.OrderBy(x => x.Order).Select(Map).ToList();
        }

        public static IReadOnlyList<string> GetDefaultStatusKeys()
        {
            return DefaultStatuses().Select(x => x.Key).ToList();
        }

        private async Task EnsureUniqueName(string name, Guid? currentId)
        {
            var trimmedName = name.Trim();
            var duplicate = await _statusConfigs.GetSingleOrDefaultAsync(x => x.Name.ToLower() == trimmedName.ToLower() && (!currentId.HasValue || x.Id != currentId.Value));
            if (duplicate != null)
                throw new ArgumentException("Status name must be unique.");
        }

        private async Task EnsureUniqueKey(string key, Guid? currentId)
        {
            var duplicate = await _statusConfigs.GetSingleOrDefaultAsync(x => x.Key == key && (!currentId.HasValue || x.Id != currentId.Value));
            if (duplicate != null)
                throw new ArgumentException("Status key must be unique.");
        }

        private static void ValidateRequest(string name, WorkItemStatusTypology typology, string customerDisplayName, int order)
        {
            WorkLogApplicationValidation.Required(name, nameof(name));
            WorkLogApplicationValidation.Required(customerDisplayName, nameof(customerDisplayName));
            if (!Enum.IsDefined(typeof(WorkItemStatusTypology), typology))
                throw new ArgumentException("Unsupported status typology.");
            if (order < 0)
                throw new ArgumentException("Order must be greater than or equal to zero.");
        }

        private static void ValidateStatusSet(IEnumerable<StatusConfig> statuses)
        {
            var activeStatuses = statuses.Where(x => x.Active).ToList();
            if (!activeStatuses.Any(x => x.Typology == WorkItemStatusTypology.New))
                throw new ArgumentException("At least one active New status is required.");
            if (!activeStatuses.Any(x => x.IsClosed()))
                throw new ArgumentException("At least one active closed status is required.");
        }

        private static StatusConfigDto Map(StatusConfig status)
        {
            return new StatusConfigDto
            {
                Id = status.Id,
                Key = status.Key,
                Name = status.Name,
                Typology = status.Typology,
                CustomerDisplayName = status.CustomerDisplayName,
                Order = status.Order,
                Active = status.Active,
                IsClosed = status.IsClosed()
            };
        }

        private static List<DefaultStatus> DefaultStatuses()
        {
            return new List<DefaultStatus>
            {
                new DefaultStatus("new", "New", WorkItemStatusTypology.New, "New", 10),
                new DefaultStatus("in-progress", "In progress", WorkItemStatusTypology.InProgress, "In progress", 20),
                new DefaultStatus("code-review", "Code review", WorkItemStatusTypology.InProgress, "In progress", 30),
                new DefaultStatus("under-analysis", "Under analysis", WorkItemStatusTypology.WaitingInternal, "In progress", 40),
                new DefaultStatus("waiting-for-customer", "Waiting for customer", WorkItemStatusTypology.WaitingCustomer, "Waiting for customer", 50),
                new DefaultStatus("closed", "Closed", WorkItemStatusTypology.Closed, "Closed", 90),
                new DefaultStatus("happy-customer", "Happy customer", WorkItemStatusTypology.Archived, "Happy customer", 100)
            };
        }

        private static string CurrentUser(WorkLogUserContext userContext)
        {
            return string.IsNullOrWhiteSpace(userContext?.Email) ? "system" : userContext.Email;
        }

        private class DefaultStatus
        {
            public DefaultStatus(string key, string name, WorkItemStatusTypology typology, string customerDisplayName, int order)
            {
                Key = key;
                Name = name;
                Typology = typology;
                CustomerDisplayName = customerDisplayName;
                Order = order;
            }

            public string Key { get; }
            public string Name { get; }
            public WorkItemStatusTypology Typology { get; }
            public string CustomerDisplayName { get; }
            public int Order { get; }
        }
    }
}
