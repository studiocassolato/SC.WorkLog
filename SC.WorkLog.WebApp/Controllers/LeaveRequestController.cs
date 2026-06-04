using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SC.WorkLog.Application.DTO.LeaveRequests;
using SC.WorkLog.Application.Services;
using SC.WorkLog.Domain.Interfaces;

namespace SC.WorkLog.WebApp.Controllers
{
    [Authorize]
    [ApiController]
    [Produces("application/json")]
    [Route("api/[controller]/[action]")]
    public class LeaveRequestController : WorkLogControllerBase
    {
        private readonly LeaveRequestService _leaveRequestService;

        public LeaveRequestController(LeaveRequestService leaveRequestService, ICurrentUser currentUser)
            : base(currentUser)
        {
            _leaveRequestService = leaveRequestService;
        }

        [HttpGet]
        public async Task<IActionResult> GetLeaveRequests([FromQuery] LeaveRequestFilter filter)
        {
            var response = await _leaveRequestService.GetLeaveRequestsAsync(filter, UserContext());
            return Ok(response);
        }

        [HttpPost]
        public async Task<IActionResult> CreateLeaveRequest(CreateLeaveRequestRequest request)
        {
            var response = await _leaveRequestService.CreateLeaveRequestAsync(request, UserContext());
            return Ok(response);
        }

        [Authorize(Policy = "AdminOnly")]
        [HttpPost]
        public async Task<IActionResult> ApproveLeaveRequest(ApproveLeaveRequestRequest request)
        {
            var response = await _leaveRequestService.ApproveLeaveRequestAsync(request, UserContext());
            return Ok(response);
        }

        [Authorize(Policy = "AdminOnly")]
        [HttpPost]
        public async Task<IActionResult> RejectLeaveRequest(RejectLeaveRequestRequest request)
        {
            var response = await _leaveRequestService.RejectLeaveRequestAsync(request, UserContext());
            return Ok(response);
        }
    }
}
