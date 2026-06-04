using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SC.WorkLog.Application.DTO.Employees;
using SC.WorkLog.Application.Services;
using SC.WorkLog.Domain.Interfaces;

namespace SC.WorkLog.WebApp.Controllers
{
    [Authorize(Policy = "AdminOnly")]
    [ApiController]
    [Produces("application/json")]
    [Route("api/[controller]/[action]")]
    public class EmployeeController : WorkLogControllerBase
    {
        private readonly EmployeeService _employeeService;

        public EmployeeController(EmployeeService employeeService, ICurrentUser currentUser)
            : base(currentUser)
        {
            _employeeService = employeeService;
        }

        [HttpGet]
        public async Task<IActionResult> GetEmployees()
        {
            var response = await _employeeService.GetEmployeesAsync(UserContext());
            return Ok(response);
        }

        [HttpGet]
        public async Task<IActionResult> GetActiveEmployees()
        {
            var response = await _employeeService.GetActiveEmployeesAsync(UserContext());
            return Ok(response);
        }

        [HttpGet]
        public async Task<IActionResult> GetEmployee([FromQuery] Guid employeeId)
        {
            var response = await _employeeService.GetEmployeeDetailAsync(employeeId, UserContext());
            return Ok(response);
        }

        [HttpPost]
        public async Task<IActionResult> CreateEmployee(CreateEmployeeRequest request)
        {
            var response = await _employeeService.CreateEmployeeAsync(request, UserContext());
            return Ok(response);
        }

        [HttpPost]
        public async Task<IActionResult> UpdateEmployee(UpdateEmployeeRequest request)
        {
            var response = await _employeeService.UpdateEmployeeAsync(request, UserContext());
            return Ok(response);
        }
    }
}
