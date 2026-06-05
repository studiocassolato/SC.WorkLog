using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using MongoDB.Bson;
using MongoDB.Driver;
using SC.WorkLog.Domain.AggregateRoots;
using SC.WorkLog.Domain.Interfaces;

namespace SC.WorkLog.Infrastructure.Repository
{
    public class WorkLogDatabaseIndexes
    {
        private readonly IRepository<Employee> _employees;
        private readonly IRepository<Customer> _customers;
        private readonly IRepository<Project> _projects;
        private readonly IRepository<ProjectMilestone> _projectMilestones;
        private readonly IRepository<WorkItem> _workItems;
        private readonly IRepository<TimeEntry> _timeEntries;
        private readonly IRepository<ProjectPayment> _projectPayments;
        private readonly IRepository<ProjectContractPeriod> _projectContractPeriods;
        private readonly IRepository<LeaveRequest> _leaveRequests;
        private readonly IRepository<OvertimeRequest> _overtimeRequests;
        private readonly IRepository<WorkItemComment> _workItemComments;
        private readonly IRepository<StatusConfig> _statusConfigs;
        private readonly IRepository<WorkLogUser> _workLogUsers;
        private readonly IRepository<ExternalImportSyncState> _externalImportSyncStates;
        private readonly IMongoDatabase _database;

        public WorkLogDatabaseIndexes(
            IRepository<Employee> employees,
            IRepository<Customer> customers,
            IRepository<Project> projects,
            IRepository<ProjectMilestone> projectMilestones,
            IRepository<WorkItem> workItems,
            IRepository<TimeEntry> timeEntries,
            IRepository<ProjectPayment> projectPayments,
            IRepository<ProjectContractPeriod> projectContractPeriods,
            IRepository<LeaveRequest> leaveRequests,
            IRepository<OvertimeRequest> overtimeRequests,
            IRepository<WorkItemComment> workItemComments,
            IRepository<StatusConfig> statusConfigs,
            IRepository<WorkLogUser> workLogUsers,
            IRepository<ExternalImportSyncState> externalImportSyncStates,
            IMongoDatabase database)
        {
            _employees = employees;
            _customers = customers;
            _projects = projects;
            _projectMilestones = projectMilestones;
            _workItems = workItems;
            _timeEntries = timeEntries;
            _projectPayments = projectPayments;
            _projectContractPeriods = projectContractPeriods;
            _leaveRequests = leaveRequests;
            _overtimeRequests = overtimeRequests;
            _workItemComments = workItemComments;
            _statusConfigs = statusConfigs;
            _workLogUsers = workLogUsers;
            _externalImportSyncStates = externalImportSyncStates;
            _database = database;
        }

        public async Task EnsureCreatedAsync()
        {
            await MigrateWorkItemAssigneeIdsToEmailAsync();

            await _employees.CreateCompoundIndex(true, nameof(Employee.Email));

            await _customers.CreateIndex(nameof(Customer.CompanyName));

            await _projects.CreateIndex(nameof(Project.CustomerId));
            await _projects.CreateIndex(nameof(Project.PaymentType));
            await _projects.CreateIndex(nameof(Project.Status));
            await _projects.CreateCompoundIndex(false, nameof(Project.CustomerId), nameof(Project.Status));
            await _projects.CreateCompoundIndex(false, nameof(Project.CustomerId), nameof(Project.IsDefault));

            await _projectMilestones.CreateIndex(nameof(ProjectMilestone.ProjectId));
            await _projectMilestones.CreateCompoundIndex(false, nameof(ProjectMilestone.ProjectId), nameof(ProjectMilestone.Date));

            await _workItems.CreateIndex(nameof(WorkItem.ProjectId));
            await _workItems.CreateIndex(nameof(WorkItem.Code));
            await _workItems.CreateIndex(nameof(WorkItem.AssigneeId));
            await _workItems.CreateIndex(nameof(WorkItem.Reporter));
            await _workItems.CreateIndex(nameof(WorkItem.StatusKey));
            await _workItems.CreateIndex(nameof(WorkItem.Priority));
            await _workItems.CreateIndex("Jira.IssueId");
            await _workItems.CreateIndex("Jira.IssueKey");
            await _workItems.CreateCompoundIndex(false, nameof(WorkItem.ProjectId), nameof(WorkItem.StatusKey));
            await _workItems.CreateCompoundIndex(false, nameof(WorkItem.AssigneeId), nameof(WorkItem.StatusKey));

            await _timeEntries.CreateIndex(nameof(TimeEntry.WorkItemId));
            await _timeEntries.CreateIndex(nameof(TimeEntry.ProjectId));
            await _timeEntries.CreateIndex(nameof(TimeEntry.Date));
            await _timeEntries.CreateIndex("Jira.TempoWorklogId");
            await _timeEntries.CreateIndex("Jira.JiraWorklogId");
            await _timeEntries.CreateIndex("Jira.IssueKey");
            await _timeEntries.CreateCompoundIndex(false, nameof(TimeEntry.ProjectId), nameof(TimeEntry.Date));
            await _timeEntries.CreateCompoundIndex(false, nameof(TimeEntry.ProjectId), nameof(TimeEntry.EmployeeId), nameof(TimeEntry.Date));
            await _timeEntries.CreateCompoundIndex(false, nameof(TimeEntry.EmployeeId), nameof(TimeEntry.Date));
            await _timeEntries.CreateCompoundIndex(false, nameof(TimeEntry.WorkItemId), nameof(TimeEntry.Date));

            await _projectPayments.CreateCompoundIndex(false, nameof(ProjectPayment.ProjectId), nameof(ProjectPayment.PaymentDate));

            await _projectContractPeriods.CreateCompoundIndex(false, nameof(ProjectContractPeriod.ProjectId), nameof(ProjectContractPeriod.StartDate), nameof(ProjectContractPeriod.EndDate));
            await _projectContractPeriods.CreateCompoundIndex(false, nameof(ProjectContractPeriod.ProjectId), nameof(ProjectContractPeriod.StartDate));
            await _projectContractPeriods.CreateCompoundIndex(false, nameof(ProjectContractPeriod.ProjectId), nameof(ProjectContractPeriod.EndDate));

            await _leaveRequests.CreateCompoundIndex(false, nameof(LeaveRequest.EmployeeId), nameof(LeaveRequest.Date));
            await _leaveRequests.CreateIndex(nameof(LeaveRequest.Status));
            await _leaveRequests.CreateCompoundIndex(false, nameof(LeaveRequest.EmployeeId), nameof(LeaveRequest.Status));

            await _overtimeRequests.CreateCompoundIndex(false, nameof(OvertimeRequest.EmployeeId), nameof(OvertimeRequest.Date));
            await _overtimeRequests.CreateIndex(nameof(OvertimeRequest.Status));

            await _workItemComments.CreateCompoundIndex(false, nameof(WorkItemComment.WorkItemId), nameof(WorkItemComment.CreatedAt));

            await _statusConfigs.CreateIndex(nameof(StatusConfig.Order));
            await _statusConfigs.CreateIndex(nameof(StatusConfig.Typology));
            await _statusConfigs.CreateIndex(nameof(StatusConfig.Active));
            await _statusConfigs.CreateCompoundIndex(true, nameof(StatusConfig.Key));
            await _statusConfigs.CreateCompoundIndex(true, nameof(StatusConfig.Name));

            await _workLogUsers.CreateCompoundIndex(true, nameof(WorkLogUser.Email));
            await _workLogUsers.CreateIndex(nameof(WorkLogUser.UserType));
            await _workLogUsers.CreateIndex(nameof(WorkLogUser.Role));
            await _workLogUsers.CreateIndex(nameof(WorkLogUser.EmployeeId));
            await _workLogUsers.CreateIndex(nameof(WorkLogUser.CustomerId));
            await _workLogUsers.CreateIndex(nameof(WorkLogUser.Active));

            await _externalImportSyncStates.CreateCompoundIndex(true, nameof(ExternalImportSyncState.Source), nameof(ExternalImportSyncState.ProjectKey));
        }

        private async Task MigrateWorkItemAssigneeIdsToEmailAsync()
        {
            var employees = await _employees.Get(x => true);
            var employeeEmailsById = employees
                .Where(x => !string.IsNullOrWhiteSpace(x.Email))
                .GroupBy(x => x.Id)
                .ToDictionary(x => x.Key, x => x.First().Email.Trim().ToLowerInvariant());

            if (!employeeEmailsById.Any())
                return;

            var workItems = _database.GetCollection<BsonDocument>(nameof(WorkItem));
            var legacyAssigneeFilter = Builders<BsonDocument>.Filter.Type(nameof(WorkItem.AssigneeId), BsonType.Binary);
            var legacyWorkItems = await workItems.Find(legacyAssigneeFilter)
                .Project(Builders<BsonDocument>.Projection.Include("_id").Include(nameof(WorkItem.AssigneeId)))
                .ToListAsync();

            foreach (var workItem in legacyWorkItems)
            {
                if (!workItem.TryGetValue("_id", out var id) || !workItem.TryGetValue(nameof(WorkItem.AssigneeId), out var assigneeValue) || !TryReadGuid(assigneeValue, out var assigneeId))
                    continue;

                var update = employeeEmailsById.TryGetValue(assigneeId, out var email)
                    ? Builders<BsonDocument>.Update.Set(nameof(WorkItem.AssigneeId), email)
                    : Builders<BsonDocument>.Update.Unset(nameof(WorkItem.AssigneeId));

                await workItems.UpdateOneAsync(Builders<BsonDocument>.Filter.Eq("_id", id), update);
            }
        }

        private static bool TryReadGuid(BsonValue value, out Guid guid)
        {
            guid = default(Guid);
            if (!value.IsBsonBinaryData)
                return false;

            var binary = value.AsBsonBinaryData;
            foreach (var representation in new[] { GuidRepresentation.Standard, GuidRepresentation.CSharpLegacy, GuidRepresentation.JavaLegacy, GuidRepresentation.PythonLegacy })
            {
                try
                {
                    guid = binary.ToGuid(representation);
                    return true;
                }
                catch
                {
                    // Try the next legacy representation used by older MongoDB driver configurations.
                }
            }

            return false;
        }
    }
}
