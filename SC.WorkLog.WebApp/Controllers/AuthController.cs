using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using SC.WorkLog.Application.DTO.Common;
using SC.WorkLog.Domain.Interfaces;
using System.Threading.Tasks;

namespace SC.WorkLog.WebApp.Controllers
{
    [Authorize]
    [ApiController]
    [Produces("application/json")]
    [Route("api/[controller]/[action]")]
    public class AuthController : ControllerBase
    {
        private readonly ICurrentUser _currentUser;

        public AuthController(ICurrentUser currentUser)
        {
            _currentUser = currentUser;
        }

        [HttpGet]
        public Task<IActionResult> Me()
        {
            return Task.FromResult<IActionResult>(Ok(MapCurrentUser()));
        }

        private CurrentUserResponse MapCurrentUser()
        {
            return new CurrentUserResponse
            {
                Subject = _currentUser.Subject,
                Email = _currentUser.Email,
                Name = _currentUser.Name,
                WorkLogUserId = _currentUser.WorkLogUserId,
                UserType = _currentUser.UserType,
                Role = _currentUser.Role,
                EmployeeId = _currentUser.EmployeeId,
                CustomerId = _currentUser.CustomerId,
                IsAuthenticated = _currentUser.IsAuthenticated,
                IsAdmin = _currentUser.IsAdmin,
                IsEmployee = _currentUser.IsEmployee,
                IsCustomer = _currentUser.IsCustomer
            };
        }
    }
}
