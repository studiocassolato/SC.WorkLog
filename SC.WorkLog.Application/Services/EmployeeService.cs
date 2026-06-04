using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using SC.WorkLog.Application.DTO.Common;
using SC.WorkLog.Application.DTO.Employees;
using SC.WorkLog.Application.Validation;
using SC.WorkLog.Domain.AggregateRoots;
using SC.WorkLog.Domain.Interfaces;

namespace SC.WorkLog.Application.Services
{
    public class EmployeeService
    {
        private readonly IRepository<Employee> _employees;

        public EmployeeService(IRepository<Employee> employees)
        {
            _employees = employees;
        }

        public async Task<List<EmployeeListItemDto>> GetEmployeesAsync(WorkLogUserContext userContext)
        {
            var employees = await _employees.Get(x => true, sortOrder: x => x.LastName);
            return employees.Select(MapListItem).ToList();
        }

        public async Task<List<EmployeeListItemDto>> GetActiveEmployeesAsync(WorkLogUserContext userContext)
        {
            var employees = await _employees.Get(x => x.Active, sortOrder: x => x.LastName);
            return employees.Select(MapListItem).ToList();
        }

        public async Task<EmployeeDetailDto> GetEmployeeDetailAsync(Guid employeeId, WorkLogUserContext userContext)
        {
            WorkLogApplicationValidation.Required(employeeId, nameof(employeeId));
            var employee = await GetEmployeeOrThrow(employeeId);
            return MapDetail(employee);
        }

        public async Task<EmployeeDetailDto> CreateEmployeeAsync(CreateEmployeeRequest request, WorkLogUserContext userContext)
        {
            WorkLogApplicationValidation.RequireAdmin(userContext, nameof(CreateEmployeeAsync));
            Validate(request.FirstName, request.LastName, request.Email, request.DefaultHourlyRate, request.ExpectedDailyHours);
            await EnsureEmailUnique(request.Email, null);

            var employee = new Employee(request.FirstName, request.LastName, request.Email, request.Level, request.DefaultHourlyRate, request.ExpectedDailyHours, CurrentUser(userContext));
            if (!request.Active)
                employee.Update(employee.FirstName, employee.LastName, employee.Email, employee.Level, employee.DefaultHourlyRate, employee.ExpectedDailyHours, false, CurrentUser(userContext));

            await _employees.InsertAsync(employee);
            return MapDetail(employee);
        }

        public async Task<EmployeeDetailDto> UpdateEmployeeAsync(UpdateEmployeeRequest request, WorkLogUserContext userContext)
        {
            WorkLogApplicationValidation.RequireAdmin(userContext, nameof(UpdateEmployeeAsync));
            WorkLogApplicationValidation.Required(request.Id, nameof(request.Id));
            Validate(request.FirstName, request.LastName, request.Email, request.DefaultHourlyRate, request.ExpectedDailyHours);
            await EnsureEmailUnique(request.Email, request.Id);

            var employee = await GetEmployeeOrThrow(request.Id);
            employee.Update(request.FirstName, request.LastName, request.Email, request.Level, request.DefaultHourlyRate, request.ExpectedDailyHours, request.Active, CurrentUser(userContext));
            await _employees.InsertOrReplace(employee);
            return MapDetail(employee);
        }

        private async Task<Employee> GetEmployeeOrThrow(Guid employeeId)
        {
            var employee = await _employees.GetSingleOrDefaultAsync(x => x.Id == employeeId);
            if (employee == null)
                throw new ArgumentException("Employee not found.");
            return employee;
        }

        private async Task EnsureEmailUnique(string email, Guid? currentEmployeeId)
        {
            var normalized = email.Trim();
            var existing = await _employees.GetSingleOrDefaultAsync(x => x.Email == normalized);
            if (existing != null && existing.Id != currentEmployeeId.GetValueOrDefault())
                throw new ArgumentException("Employee email must be unique.");
        }

        private static void Validate(string firstName, string lastName, string email, decimal defaultHourlyRate, decimal expectedDailyHours)
        {
            WorkLogApplicationValidation.Required(firstName, nameof(firstName));
            WorkLogApplicationValidation.Required(lastName, nameof(lastName));
            WorkLogApplicationValidation.Required(email, nameof(email));
            WorkLogApplicationValidation.NonNegative(defaultHourlyRate, nameof(defaultHourlyRate));
            WorkLogApplicationValidation.HalfHourIncrement(expectedDailyHours, nameof(expectedDailyHours));
        }

        private static EmployeeListItemDto MapListItem(Employee employee)
        {
            return new EmployeeListItemDto
            {
                Id = employee.Id,
                FirstName = employee.FirstName,
                LastName = employee.LastName,
                Email = employee.Email,
                Level = employee.Level,
                DefaultHourlyRate = employee.DefaultHourlyRate,
                ExpectedDailyHours = employee.ExpectedDailyHours,
                Active = employee.Active
            };
        }

        private static EmployeeDetailDto MapDetail(Employee employee)
        {
            return new EmployeeDetailDto
            {
                Id = employee.Id,
                FirstName = employee.FirstName,
                LastName = employee.LastName,
                Email = employee.Email,
                Level = employee.Level,
                DefaultHourlyRate = employee.DefaultHourlyRate,
                ExpectedDailyHours = employee.ExpectedDailyHours,
                Active = employee.Active
            };
        }

        private static string CurrentUser(WorkLogUserContext userContext)
        {
            return string.IsNullOrWhiteSpace(userContext?.Email) ? "system" : userContext.Email;
        }
    }
}
