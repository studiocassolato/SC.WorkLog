using System;
using System.Collections.Generic;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Primitives;

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
                context.Request.Headers.TryGetValue("Accept", out StringValues acceptValue);
                if (acceptValue.ToString().Contains("application/json"))
                    context.Response.ContentType = "application/json";

                await _next(context);
            }
            catch (ArgumentException ex)
            {
                // This is necessary because not everybody is enabling the "Stop on every exception" option.
                // When the setting is not enabled, request exceptions can be hidden while debugging.
                System.Diagnostics.Debug.WriteLine(ex);

                _logger.LogError(ex, "\nError executing api {Path}\n[ERROR MESSAGE] {ErrorMessage}", context.Request.Path.Value, ex.Message);
                context.Response.StatusCode = (int)HttpStatusCode.BadRequest;

                var result = JsonSerializer.Serialize(new ErrorResponse(new List<string> { ex.Message }));
                await context.Response.WriteAsync(result);
            }
            catch (Exception ex)
            {
                // This is necessary because not everybody is enabling the "Stop on every exception" option.
                // When the setting is not enabled, request exceptions can be hidden while debugging.
                System.Diagnostics.Debug.WriteLine(ex);

                _logger.LogError(ex, "\nError executing api {Path}\n[ERROR MESSAGE] Internal server error", context.Request.Path.Value);
                context.Response.StatusCode = (int)HttpStatusCode.InternalServerError;

                var result = JsonSerializer.Serialize(new ErrorResponse(new List<string>()));
                await context.Response.WriteAsync(result);
            }
        }

    }
}
