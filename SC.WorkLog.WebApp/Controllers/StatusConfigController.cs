using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SC.WorkLog.Application.DTO.StatusConfigs;
using SC.WorkLog.Application.Services;
using SC.WorkLog.Domain.Interfaces;

namespace SC.WorkLog.WebApp.Controllers
{
    [Authorize]
    [ApiController]
    [Produces("application/json")]
    [Route("api/[controller]/[action]")]
    public class StatusConfigController : WorkLogControllerBase
    {
        private readonly StatusConfigService _statusConfigService;

        public StatusConfigController(StatusConfigService statusConfigService, ICurrentUser currentUser)
            : base(currentUser)
        {
            _statusConfigService = statusConfigService;
        }

        [HttpGet]
        public async Task<IActionResult> GetStatusConfigs()
        {
            var response = await _statusConfigService.GetStatusConfigs();
            return Ok(response);
        }

        [Authorize(Policy = "AdminOnly")]
        [HttpPost]
        public async Task<IActionResult> CreateStatusConfig(CreateStatusConfigRequest request)
        {
            var response = await _statusConfigService.CreateStatusConfig(request, UserContext());
            return Ok(response);
        }

        [Authorize(Policy = "AdminOnly")]
        [HttpPost]
        public async Task<IActionResult> UpdateStatusConfig(UpdateStatusConfigRequest request)
        {
            var response = await _statusConfigService.UpdateStatusConfig(request, UserContext());
            return Ok(response);
        }

        [Authorize(Policy = "AdminOnly")]
        [HttpPost]
        public async Task<IActionResult> EnsureDefaultStatuses()
        {
            var response = await _statusConfigService.EnsureDefaultStatuses(UserContext());
            return Ok(response);
        }
    }
}
