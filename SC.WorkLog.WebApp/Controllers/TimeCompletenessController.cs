using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SC.WorkLog.Application.DTO.Reports;
using SC.WorkLog.Application.Services;
using SC.WorkLog.Domain.Interfaces;

namespace SC.WorkLog.WebApp.Controllers
{
    [Authorize(Policy = "AdminOnly")]
    [ApiController]
    [Produces("application/json")]
    [Route("api/[controller]/[action]")]
    public class TimeCompletenessController : WorkLogControllerBase
    {
        private readonly TimeCompletenessService _timeCompletenessService;

        public TimeCompletenessController(TimeCompletenessService timeCompletenessService, ICurrentUser currentUser)
            : base(currentUser)
        {
            _timeCompletenessService = timeCompletenessService;
        }

        [HttpPost]
        public async Task<IActionResult> GetTimeCompleteness(TimeCompletenessFilter filter)
        {
            var response = await _timeCompletenessService.GetTimeCompletenessAsync(filter, UserContext());
            return Ok(response);
        }
    }
}
