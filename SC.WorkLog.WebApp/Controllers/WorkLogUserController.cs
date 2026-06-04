using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SC.WorkLog.Application.DTO.WorkLogUsers;
using SC.WorkLog.Application.Services;
using SC.WorkLog.Domain.Interfaces;

namespace SC.WorkLog.WebApp.Controllers
{
    [Authorize(Policy = "AdminOnly")]
    [ApiController]
    [Produces("application/json")]
    [Route("api/[controller]/[action]")]
    public class WorkLogUserController : WorkLogControllerBase
    {
        private readonly WorkLogUserService _workLogUserService;

        public WorkLogUserController(WorkLogUserService workLogUserService, ICurrentUser currentUser)
            : base(currentUser)
        {
            _workLogUserService = workLogUserService;
        }

        [HttpGet]
        public async Task<IActionResult> GetUsers([FromQuery] WorkLogUserFilter filter)
        {
            var response = await _workLogUserService.GetUsers(filter, UserContext());
            return Ok(response);
        }

        [HttpGet]
        public async Task<IActionResult> GetUser([FromQuery] Guid userId)
        {
            var response = await _workLogUserService.GetUser(userId, UserContext());
            return Ok(response);
        }

        [HttpPost]
        public async Task<IActionResult> CreateUser(CreateWorkLogUserRequest request)
        {
            var response = await _workLogUserService.CreateUser(request, UserContext());
            return Ok(response);
        }

        [HttpPost]
        public async Task<IActionResult> UpdateUser(UpdateWorkLogUserRequest request)
        {
            var response = await _workLogUserService.UpdateUser(request, UserContext());
            return Ok(response);
        }
    }
}
