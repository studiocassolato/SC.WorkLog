using Microsoft.AspNetCore.Mvc;
using SC.WorkLog.Application.DTO.Common;
using SC.WorkLog.Domain.Enums;
using SC.WorkLog.Domain.Interfaces;

namespace SC.WorkLog.WebApp.Controllers
{
    public abstract class WorkLogControllerBase : ControllerBase
    {
        private readonly ICurrentUser _currentUser;

        protected WorkLogControllerBase(ICurrentUser currentUser)
        {
            _currentUser = currentUser;
        }

        protected WorkLogUserContext UserContext()
        {
            return new WorkLogUserContext
            {
                UserId = _currentUser.WorkLogUserId.GetValueOrDefault(),
                EmployeeId = _currentUser.EmployeeId.GetValueOrDefault(),
                Email = _currentUser.Email,
                Role = _currentUser.Role == WorkLogUserRole.Admin ? ApplicationUserRole.Admin : ApplicationUserRole.Employee
            };
        }
    }
}
