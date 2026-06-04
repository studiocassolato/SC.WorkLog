using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SC.WorkLog.Application.DTO.TimeEntries;
using SC.WorkLog.Application.Services;
using SC.WorkLog.Domain.Interfaces;

namespace SC.WorkLog.WebApp.Controllers
{
    [Authorize]
    [ApiController]
    [Produces("application/json")]
    [Route("api/[controller]/[action]")]
    public class TimeEntryController : WorkLogControllerBase
    {
        private readonly TimeEntryService _timeEntryService;

        public TimeEntryController(TimeEntryService timeEntryService, ICurrentUser currentUser)
            : base(currentUser)
        {
            _timeEntryService = timeEntryService;
        }

        [HttpGet]
        public async Task<IActionResult> GetTimeEntries([FromQuery] TimeEntryFilter filter)
        {
            var response = await _timeEntryService.GetTimeEntriesAsync(filter, UserContext());
            return Ok(response);
        }

        [HttpPost]
        public async Task<IActionResult> CreateTimeEntry(CreateTimeEntryRequest request)
        {
            var response = await _timeEntryService.CreateTimeEntryAsync(request, UserContext());
            return Ok(response);
        }

        [HttpPost]
        public async Task<IActionResult> UpdateTimeEntry(UpdateTimeEntryRequest request)
        {
            var response = await _timeEntryService.UpdateTimeEntryAsync(request, UserContext());
            return Ok(response);
        }

        [Authorize(Policy = "AdminOnly")]
        [HttpPost]
        public async Task<IActionResult> UpdateApprovedTime(UpdateApprovedTimeRequest request)
        {
            var response = await _timeEntryService.UpdateApprovedTimeAsync(request, UserContext());
            return Ok(response);
        }
    }
}
