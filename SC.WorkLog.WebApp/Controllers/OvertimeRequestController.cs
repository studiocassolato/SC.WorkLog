using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SC.WorkLog.Application.DTO.OvertimeRequests;
using SC.WorkLog.Application.Services;
using SC.WorkLog.Domain.Interfaces;

namespace SC.WorkLog.WebApp.Controllers
{
    [Authorize(Policy = "AdminOnly")]
    [ApiController]
    [Produces("application/json")]
    [Route("api/[controller]/[action]")]
    public class OvertimeRequestController : WorkLogControllerBase
    {
        private readonly OvertimeRequestService _overtimeRequestService;

        public OvertimeRequestController(OvertimeRequestService overtimeRequestService, ICurrentUser currentUser)
            : base(currentUser)
        {
            _overtimeRequestService = overtimeRequestService;
        }

        [HttpGet]
        public async Task<IActionResult> GetOvertimeRequests([FromQuery] OvertimeRequestFilter filter)
        {
            var response = await _overtimeRequestService.GetOvertimeRequestsAsync(filter, UserContext());
            return Ok(response);
        }

        [HttpGet]
        public async Task<IActionResult> GetOvertimeRequest([FromQuery] Guid overtimeRequestId)
        {
            var response = await _overtimeRequestService.GetOvertimeRequestDetailAsync(overtimeRequestId, UserContext());
            return Ok(response);
        }

        [HttpPost]
        public async Task<IActionResult> ApproveOvertimeRequest(ApproveOvertimeRequestRequest request)
        {
            var response = await _overtimeRequestService.ApproveOvertimeRequestAsync(request, UserContext());
            return Ok(response);
        }

        [HttpPost]
        public async Task<IActionResult> RejectOvertimeRequest(RejectOvertimeRequestRequest request)
        {
            var response = await _overtimeRequestService.RejectOvertimeRequestAsync(request, UserContext());
            return Ok(response);
        }
    }
}
