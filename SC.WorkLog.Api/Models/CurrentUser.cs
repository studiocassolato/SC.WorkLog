using Microsoft.AspNetCore.Http;
using SC.WorkLog.Domain.Interfaces;

namespace SC.WorkLog.Api.Models
{
    public class CurrentUser : ICurrentUser
    {
        private readonly IHttpContextAccessor _httpContextAccessor;

        public CurrentUser(IHttpContextAccessor httpContextAccessor)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        public string UserName
        {
            get
            {
                return _httpContextAccessor.HttpContext?.User?.Identity?.Name ?? "anonymous";
            }
        }

        public bool IsAuthenticated
        {
            get
            {
                return _httpContextAccessor.HttpContext?.User?.Identity?.IsAuthenticated ?? false;
            }
        }
    }
}
