using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SC.WorkLog.Application.DTO.WorkItems;
using SC.WorkLog.Application.Services;
using SC.WorkLog.Domain.Interfaces;

namespace SC.WorkLog.WebApp.Controllers
{
    [Authorize]
    [ApiController]
    [Produces("application/json")]
    [Route("api/[controller]/[action]")]
    public class WorkItemController : WorkLogControllerBase
    {
        private readonly WorkItemService _workItemService;

        public WorkItemController(WorkItemService workItemService, ICurrentUser currentUser)
            : base(currentUser)
        {
            _workItemService = workItemService;
        }

        [HttpGet]
        public async Task<IActionResult> GetWorkItems([FromQuery] WorkItemFilter filter)
        {
            var response = await _workItemService.GetWorkItemsAsync(filter, UserContext());
            return Ok(response);
        }

        [HttpGet]
        public async Task<IActionResult> GetWorkItem([FromQuery] Guid workItemId)
        {
            var response = await _workItemService.GetWorkItemDetailAsync(workItemId, UserContext());
            return Ok(response);
        }

        [HttpPost]
        [Authorize(Policy = "AdminOnly")]
        public async Task<IActionResult> CreateWorkItem(CreateWorkItemRequest request)
        {
            var response = await _workItemService.CreateWorkItemAsync(request, UserContext());
            return Ok(response);
        }

        [HttpPost]
        [Authorize(Policy = "AdminOnly")]
        public async Task<IActionResult> UpdateWorkItem(UpdateWorkItemRequest request)
        {
            var response = await _workItemService.UpdateWorkItemAsync(request, UserContext());
            return Ok(response);
        }

        [HttpPost]
        public async Task<IActionResult> AddComment(AddWorkItemCommentRequest request)
        {
            await _workItemService.AddCommentAsync(request, UserContext());
            return Ok();
        }
    }
}
