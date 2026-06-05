using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SC.WorkLog.Application.DTO.ContractPeriods;
using SC.WorkLog.Application.DTO.Payments;
using SC.WorkLog.Application.DTO.Projects;
using SC.WorkLog.Application.Services;
using SC.WorkLog.Domain.Enums;
using SC.WorkLog.Domain.Interfaces;

namespace SC.WorkLog.WebApp.Controllers
{
    [Authorize]
    [ApiController]
    [Produces("application/json")]
    [Route("api/[controller]/[action]")]
    public class ProjectController : WorkLogControllerBase
    {
        private readonly ProjectService _projectService;

        public ProjectController(ProjectService projectService, ICurrentUser currentUser)
            : base(currentUser)
        {
            _projectService = projectService;
        }

        [HttpGet]
        public async Task<IActionResult> GetProjects()
        {
            var response = await _projectService.GetProjectsAsync(UserContext());
            return Ok(response);
        }

        [HttpGet]
        public async Task<IActionResult> SearchProjects([FromQuery] string search = "", [FromQuery] Guid? customerId = null, [FromQuery] ProjectStatus? status = null, [FromQuery] ProjectPaymentType? paymentType = null)
        {
            var response = await _projectService.SearchProjectsAsync(search, customerId, status, paymentType, UserContext());
            return Ok(response);
        }

        [HttpGet]
        public async Task<IActionResult> GetProject([FromQuery] Guid projectId)
        {
            var response = await _projectService.GetProjectDetailAsync(projectId, UserContext());
            return Ok(response);
        }

        [Authorize(Policy = "AdminOnly")]
        [HttpPost]
        public async Task<IActionResult> CreateProject(CreateProjectRequest request)
        {
            var response = await _projectService.CreateProjectAsync(request, UserContext());
            return Ok(response);
        }

        [Authorize(Policy = "AdminOnly")]
        [HttpPost]
        public async Task<IActionResult> UpdateProject(UpdateProjectRequest request)
        {
            var response = await _projectService.UpdateProjectAsync(request, UserContext());
            return Ok(response);
        }

        [Authorize(Policy = "AdminOnly")]
        [HttpGet]
        public async Task<IActionResult> GetProjectEconomics([FromQuery] Guid projectId)
        {
            var response = await _projectService.GetProjectEconomicsAsync(projectId, UserContext());
            return Ok(response);
        }

        [Authorize(Policy = "AdminOnly")]
        [HttpGet]
        public async Task<IActionResult> GetProjectPayments([FromQuery] Guid projectId)
        {
            var response = await _projectService.GetProjectPaymentsAsync(projectId, UserContext());
            return Ok(response);
        }

        [Authorize(Policy = "AdminOnly")]
        [HttpPost]
        public async Task<IActionResult> CreateProjectPayment(CreateProjectPaymentRequest request)
        {
            var response = await _projectService.CreateProjectPaymentAsync(request, UserContext());
            return Ok(response);
        }

        [Authorize(Policy = "AdminOnly")]
        [HttpPost]
        public async Task<IActionResult> UpdateProjectPayment(UpdateProjectPaymentRequest request)
        {
            var response = await _projectService.UpdateProjectPaymentAsync(request, UserContext());
            return Ok(response);
        }

        [Authorize(Policy = "AdminOnly")]
        [HttpPost]
        public async Task<IActionResult> DeleteProjectPayment(DeleteProjectPaymentRequest request)
        {
            await _projectService.DeleteProjectPaymentAsync(request, UserContext());
            return Ok();
        }

        [Authorize(Policy = "AdminOnly")]
        [HttpGet]
        public async Task<IActionResult> GetProjectContractPeriods([FromQuery] Guid projectId)
        {
            var response = await _projectService.GetProjectContractPeriodsAsync(projectId, UserContext());
            return Ok(response);
        }

        [Authorize(Policy = "AdminOnly")]
        [HttpPost]
        public async Task<IActionResult> CreateProjectContractPeriod(CreateProjectContractPeriodRequest request)
        {
            var response = await _projectService.CreateProjectContractPeriodAsync(request, UserContext());
            return Ok(response);
        }

        [Authorize(Policy = "AdminOnly")]
        [HttpPost]
        public async Task<IActionResult> UpdateProjectContractPeriod(UpdateProjectContractPeriodRequest request)
        {
            var response = await _projectService.UpdateProjectContractPeriodAsync(request, UserContext());
            return Ok(response);
        }

        [Authorize(Policy = "AdminOnly")]
        [HttpPost]
        public async Task<IActionResult> DeleteProjectContractPeriod(DeleteProjectContractPeriodRequest request)
        {
            await _projectService.DeleteProjectContractPeriodAsync(request, UserContext());
            return Ok();
        }

        [Authorize(Policy = "AdminOnly")]
        [HttpPost]
        public async Task<IActionResult> CreateMilestone(ProjectMilestoneDto request)
        {
            var response = await _projectService.CreateProjectMilestoneAsync(request, UserContext());
            return Ok(response);
        }

        [Authorize(Policy = "AdminOnly")]
        [HttpPost]
        public async Task<IActionResult> UpdateMilestone(ProjectMilestoneDto request)
        {
            var response = await _projectService.UpdateProjectMilestoneAsync(request, UserContext());
            return Ok(response);
        }

        [Authorize(Policy = "AdminOnly")]
        [HttpPost]
        public async Task<IActionResult> DeleteMilestone(ProjectMilestoneDto request)
        {
            await _projectService.DeleteProjectMilestoneAsync(request, UserContext());
            return Ok();
        }
    }
}
