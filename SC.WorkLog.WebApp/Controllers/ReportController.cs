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
    public class ReportController : WorkLogControllerBase
    {
        private readonly ProjectReportService _projectReportService;

        public ReportController(ProjectReportService projectReportService, ICurrentUser currentUser)
            : base(currentUser)
        {
            _projectReportService = projectReportService;
        }

        [HttpPost]
        public async Task<IActionResult> GetCustomerReport(CustomerReportFilter filter)
        {
            var response = await _projectReportService.GetCustomerReportAsync(filter, UserContext());
            return Ok(response);
        }
    }
}
