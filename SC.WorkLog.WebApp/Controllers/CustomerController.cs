using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SC.WorkLog.Application.DTO.Customers;
using SC.WorkLog.Application.Services;
using SC.WorkLog.Domain.Interfaces;

namespace SC.WorkLog.WebApp.Controllers
{
    [Authorize]
    [ApiController]
    [Produces("application/json")]
    [Route("api/[controller]/[action]")]
    public class CustomerController : WorkLogControllerBase
    {
        private readonly CustomerService _customerService;

        public CustomerController(CustomerService customerService, ICurrentUser currentUser)
            : base(currentUser)
        {
            _customerService = customerService;
        }

        [HttpGet]
        public async Task<IActionResult> GetCustomers()
        {
            var response = await _customerService.GetCustomersAsync(UserContext());
            return Ok(response);
        }

        [HttpGet]
        public async Task<IActionResult> SearchCustomers([FromQuery] string search)
        {
            var response = await _customerService.SearchCustomersAsync(search, UserContext());
            return Ok(response);
        }

        [HttpGet]
        public async Task<IActionResult> GetCustomer([FromQuery] Guid customerId)
        {
            var response = await _customerService.GetCustomerDetailAsync(customerId, UserContext());
            return Ok(response);
        }

        [Authorize(Policy = "AdminOnly")]
        [HttpPost]
        public async Task<IActionResult> CreateCustomer(CreateCustomerRequest request)
        {
            var response = await _customerService.CreateCustomerAsync(request, UserContext());
            return Ok(response);
        }

        [Authorize(Policy = "AdminOnly")]
        [HttpPost]
        public async Task<IActionResult> UpdateCustomer(UpdateCustomerRequest request)
        {
            var response = await _customerService.UpdateCustomerAsync(request, UserContext());
            return Ok(response);
        }
    }
}
