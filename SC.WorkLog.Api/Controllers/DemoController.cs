using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace SC.WorkLog.Api.Controllers
{
    [AllowAnonymous]
    [ApiController]
    [Produces("application/json")]
    [Route("api/[controller]/[action]")]
    public class DemoController : ControllerBase
    {
        [HttpGet]
        public IActionResult GetStatus()
        {
            return Ok(new
            {
                Application = "SC.WorkLog.Api",
                Status = "Ready"
            });
        }
    }
}
