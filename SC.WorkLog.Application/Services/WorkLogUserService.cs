using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using SC.WorkLog.Application.DTO.Common;
using SC.WorkLog.Application.DTO.WorkLogUsers;
using SC.WorkLog.Application.Validation;
using SC.WorkLog.Domain.AggregateRoots;
using SC.WorkLog.Domain.Enums;
using SC.WorkLog.Domain.Interfaces;

namespace SC.WorkLog.Application.Services
{
    public class WorkLogUserService
    {
        private readonly IRepository<WorkLogUser> _users;
        private readonly IRepository<Employee> _employees;
        private readonly IRepository<Customer> _customers;

        public WorkLogUserService(IRepository<WorkLogUser> users, IRepository<Employee> employees, IRepository<Customer> customers)
        {
            _users = users;
            _employees = employees;
            _customers = customers;
        }

        public async Task<List<WorkLogUserListItemDto>> GetUsers(WorkLogUserFilter filter, WorkLogUserContext userContext)
        {
            WorkLogApplicationValidation.RequireAdmin(userContext, nameof(GetUsers));
            filter = filter ?? new WorkLogUserFilter();
            var email = string.IsNullOrWhiteSpace(filter.Email) ? null : filter.Email.Trim();
            var users = await _users.Get(x => (email == null || x.Email.Contains(email))
                && (!filter.UserType.HasValue || x.UserType == filter.UserType.Value)
                && (!filter.Role.HasValue || x.Role == filter.Role.Value)
                && (!filter.EmployeeId.HasValue || x.EmployeeId == filter.EmployeeId.Value)
                && (!filter.CustomerId.HasValue || x.CustomerId == filter.CustomerId.Value)
                && (!filter.Active.HasValue || x.Active == filter.Active.Value), sortOrder: x => x.Email);
            return await BuildUserList(users);
        }

        public async Task<WorkLogUserDetailDto> GetUser(Guid userId, WorkLogUserContext userContext)
        {
            WorkLogApplicationValidation.RequireAdmin(userContext, nameof(GetUser));
            var user = await GetUserOrThrow(userId);
            return await BuildUserDetail(user);
        }

        public async Task<WorkLogUserDetailDto> CreateUser(CreateWorkLogUserRequest request, WorkLogUserContext userContext)
        {
            WorkLogApplicationValidation.RequireAdmin(userContext, nameof(CreateUser));
            await ValidateReferences(request.UserType, request.EmployeeId, request.CustomerId);
            await EnsureUnique(request.Email, request.CognitoSub, null);
            var user = new WorkLogUser(request.Email, request.CognitoSub, request.UserType, request.Role, request.EmployeeId, request.CustomerId, request.DisplayName, CurrentUser(userContext));
            if (!request.Active)
                user.Update(user.Email, user.CognitoSub, user.UserType, user.Role, user.EmployeeId, user.CustomerId, user.DisplayName, false, CurrentUser(userContext));
            await _users.InsertAsync(user);
            return await BuildUserDetail(user);
        }

        public async Task<WorkLogUserDetailDto> UpdateUser(UpdateWorkLogUserRequest request, WorkLogUserContext userContext)
        {
            WorkLogApplicationValidation.RequireAdmin(userContext, nameof(UpdateUser));
            WorkLogApplicationValidation.Required(request.Id, nameof(request.Id));
            await ValidateReferences(request.UserType, request.EmployeeId, request.CustomerId);
            await EnsureUnique(request.Email, request.CognitoSub, request.Id);
            var user = await GetUserOrThrow(request.Id);
            user.Update(request.Email, request.CognitoSub, request.UserType, request.Role, request.EmployeeId, request.CustomerId, request.DisplayName, request.Active, CurrentUser(userContext));
            await _users.InsertOrReplace(user);
            return await BuildUserDetail(user);
        }

        public Task<WorkLogUser> GetUserByEmail(string email)
        {
            WorkLogApplicationValidation.Required(email, nameof(email));
            var normalized = email.Trim();
            return _users.GetSingleOrDefaultAsync(x => x.Email == normalized);
        }

        public Task<WorkLogUser> GetUserByCognitoSub(string cognitoSub)
        {
            WorkLogApplicationValidation.Required(cognitoSub, nameof(cognitoSub));
            var normalized = cognitoSub.Trim();
            return _users.GetSingleOrDefaultAsync(x => x.CognitoSub == normalized);
        }

        public async Task<WorkLogUser> ResolveAuthenticatedUser(string cognitoSub, string email)
        {
            WorkLogUser user = null;
            if (!string.IsNullOrWhiteSpace(cognitoSub))
                user = await GetUserByCognitoSub(cognitoSub);
            if (user == null && !string.IsNullOrWhiteSpace(email))
                user = await GetUserByEmail(email);
            if (user == null)
                throw new ArgumentException("The authenticated Cognito user is not linked to a WorkLog user.");
            if (!user.Active)
                throw new ArgumentException("The linked WorkLog user is not active.");
            if (user.UserType == WorkLogUserType.Customer)
                throw new UnauthorizedAccessException("Customer access is not enabled yet.");
            if (!user.EmployeeId.HasValue)
                throw new ArgumentException("Employee WorkLog users require EmployeeId.");
            var employee = await _employees.GetSingleOrDefaultAsync(x => x.Id == user.EmployeeId.Value);
            if (employee == null || !employee.Active)
                throw new ArgumentException("The linked WorkLog employee is not active.");
            return user;
        }

        private async Task<WorkLogUser> GetUserOrThrow(Guid userId)
        {
            var user = await _users.GetSingleOrDefaultAsync(x => x.Id == userId);
            if (user == null)
                throw new ArgumentException("WorkLog user not found.");
            return user;
        }

        private async Task ValidateReferences(WorkLogUserType userType, Guid? employeeId, Guid? customerId)
        {
            if (userType == WorkLogUserType.Employee)
            {
                if (!employeeId.HasValue)
                    throw new ArgumentException("Employee users require EmployeeId.");
                var employee = await _employees.GetSingleOrDefaultAsync(x => x.Id == employeeId.Value);
                if (employee == null)
                    throw new ArgumentException("Employee not found.");
            }
            if (userType == WorkLogUserType.Customer)
            {
                if (!customerId.HasValue)
                    throw new ArgumentException("Customer users require CustomerId.");
                var customer = await _customers.GetSingleOrDefaultAsync(x => x.Id == customerId.Value);
                if (customer == null)
                    throw new ArgumentException("Customer not found.");
            }
        }

        private async Task EnsureUnique(string email, string cognitoSub, Guid? currentUserId)
        {
            WorkLogApplicationValidation.Required(email, nameof(email));
            var normalizedEmail = email.Trim();
            var existingEmail = await _users.GetSingleOrDefaultAsync(x => x.Email == normalizedEmail);
            if (existingEmail != null && existingEmail.Id != currentUserId.GetValueOrDefault())
                throw new ArgumentException("WorkLog user email must be unique.");
            if (!string.IsNullOrWhiteSpace(cognitoSub))
            {
                var normalizedSub = cognitoSub.Trim();
                var existingSub = await _users.GetSingleOrDefaultAsync(x => x.CognitoSub == normalizedSub);
                if (existingSub != null && existingSub.Id != currentUserId.GetValueOrDefault())
                    throw new ArgumentException("WorkLog user CognitoSub must be unique.");
            }
        }

        private async Task<List<WorkLogUserListItemDto>> BuildUserList(List<WorkLogUser> users)
        {
            var employeeIds = users.Where(x => x.EmployeeId.HasValue).Select(x => x.EmployeeId.Value).Distinct().ToList();
            var customerIds = users.Where(x => x.CustomerId.HasValue).Select(x => x.CustomerId.Value).Distinct().ToList();
            var employees = employeeIds.Any() ? await _employees.Get(x => employeeIds.Contains(x.Id)) : new List<Employee>();
            var customers = customerIds.Any() ? await _customers.Get(x => customerIds.Contains(x.Id)) : new List<Customer>();
            var employeesById = employees.ToDictionary(x => x.Id);
            var customersById = customers.ToDictionary(x => x.Id);
            return users.Select(x => MapListItem(x, employeesById, customersById)).ToList();
        }

        private async Task<WorkLogUserDetailDto> BuildUserDetail(WorkLogUser user)
        {
            return (await BuildUserList(new List<WorkLogUser> { user })).Select(x => new WorkLogUserDetailDto
            {
                Id = x.Id,
                Email = x.Email,
                CognitoSub = x.CognitoSub,
                UserType = x.UserType,
                Role = x.Role,
                EmployeeId = x.EmployeeId,
                EmployeeName = x.EmployeeName,
                CustomerId = x.CustomerId,
                CustomerName = x.CustomerName,
                DisplayName = x.DisplayName,
                Active = x.Active
            }).Single();
        }

        private static WorkLogUserListItemDto MapListItem(WorkLogUser user, Dictionary<Guid, Employee> employeesById, Dictionary<Guid, Customer> customersById)
        {
            var employeeName = user.EmployeeId.HasValue && employeesById.TryGetValue(user.EmployeeId.Value, out var employee)
                ? string.Concat(employee.FirstName, " ", employee.LastName)
                : null;
            var customerName = user.CustomerId.HasValue && customersById.TryGetValue(user.CustomerId.Value, out var customer)
                ? customer.CompanyName
                : null;
            return new WorkLogUserListItemDto
            {
                Id = user.Id,
                Email = user.Email,
                CognitoSub = user.CognitoSub,
                UserType = user.UserType,
                Role = user.Role,
                EmployeeId = user.EmployeeId,
                EmployeeName = employeeName,
                CustomerId = user.CustomerId,
                CustomerName = customerName,
                DisplayName = user.DisplayName,
                Active = user.Active
            };
        }

        private static string CurrentUser(WorkLogUserContext userContext)
        {
            return string.IsNullOrWhiteSpace(userContext?.Email) ? "system" : userContext.Email;
        }
    }
}
