using System;
using System.Collections.Generic;
using System.Net;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;

namespace SC.WorkLog.Common.Exceptions
{
    public class ExceptionsHandler
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<ExceptionsHandler> _logger;

        public ExceptionsHandler(RequestDelegate next, ILogger<ExceptionsHandler> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task Invoke(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (ArgumentException ex)
            {
                _logger.LogError(ex, "Error executing api {Path}", context.Request.Path.Value);
                context.Response.StatusCode = (int)HttpStatusCode.BadRequest;
                context.Response.ContentType = "application/json";

                var result = JsonConvert.SerializeObject(new ErrorResponse(new List<string> { ex.Message }));
                await context.Response.WriteAsync(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Internal server error");
                context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;
                context.Response.ContentType = "application/json";

                var result = JsonConvert.SerializeObject(new ErrorResponse(new List<string>()));
                await context.Response.WriteAsync(result);
            }
        }
    }
}
