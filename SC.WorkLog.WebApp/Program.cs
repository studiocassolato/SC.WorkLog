using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.FileProviders;
using Microsoft.IdentityModel.Tokens;
using Newtonsoft.Json.Converters;
using SC.WorkLog.Application;
using SC.WorkLog.Application.Services;
using SC.WorkLog.Common.Settings;
using SC.WorkLog.Common.Configuration;
using SC.WorkLog.Common.Exceptions;
using SC.WorkLog.Domain.AggregateRoots;
using SC.WorkLog.Domain.Constants;
using SC.WorkLog.Domain.Enums;
using SC.WorkLog.Domain.Interfaces;
using SC.WorkLog.WebApp.Models;
using Serilog;
using Serilog.Events;
using System.Security.Claims;

Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Override("Microsoft", LogEventLevel.Information)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .CreateBootstrapLogger();

var builder = WebApplication.CreateBuilder(new WebApplicationOptions
{
    Args = args,
    ContentRootPath = Directory.GetCurrentDirectory(),
    EnvironmentName = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT")
});

builder.Host.UseSerilog((context, services, configuration) => configuration
        .ReadFrom.Configuration(context.Configuration)
        .ReadFrom.Services(services)
        .Enrich.FromLogContext()
        .WriteTo.Console(),
    writeToProviders: true);

WorkLogConfigurationManager.SetConfiguration(builder.Configuration, builder.Environment.EnvironmentName);

builder.Services.AddApplicationServices(builder.Configuration);
builder.Services.AddApplicationPolicies();
builder.Services.AddMemoryCache();
builder.Services.AddSingleton<IHttpContextAccessor, HttpContextAccessor>();
builder.Services.AddScoped<ICurrentUser, CurrentUser>();

var cognitoSettings = builder.Configuration.GetSection(nameof(CognitoSettings)).Get<CognitoSettings>() ?? new CognitoSettings();
var cognitoAuthority = GetCognitoAuthority(cognitoSettings);

builder.Services
    .AddAuthentication(options =>
    {
        options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
        options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
    })
    .AddJwtBearer(options =>
    {
        options.Authority = cognitoAuthority;
        options.SaveToken = true;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            ValidateIssuer = true,
            ValidIssuer = string.IsNullOrWhiteSpace(cognitoSettings.ValidIssuer) ? cognitoAuthority : cognitoSettings.ValidIssuer,
            ValidateLifetime = true,
            ValidateAudience = false
        };
        options.Events = new JwtBearerEvents
        {
            OnTokenValidated = async context =>
            {
                var principal = context.Principal;
                if (principal == null)
                {
                    context.Fail("The Cognito token could not be read.");
                    return;
                }

                var validatedPrincipal = principal;
                var email = validatedPrincipal.FindFirstValue(ClaimTypes.Email) ?? validatedPrincipal.FindFirstValue("email");
                var tokenUse = validatedPrincipal.FindFirstValue("token_use");
                if (!string.Equals(tokenUse, "id", StringComparison.Ordinal))
                {
                    context.Fail("The Cognito token must be an id token.");
                    return;
                }

                if (string.IsNullOrWhiteSpace(email))
                {
                    context.Fail("The Cognito token does not contain an email claim.");
                    return;
                }

                if (!IsExpectedCognitoClient(validatedPrincipal, cognitoSettings))
                {
                    context.Fail("The Cognito token was not issued for the configured app client.");
                    return;
                }

                var userService = context.HttpContext.RequestServices.GetRequiredService<WorkLogUserService>();
                var logger = context.HttpContext.RequestServices.GetRequiredService<ILoggerFactory>().CreateLogger("WorkLogAuthentication");
                WorkLogUser workLogUser;
                try
                {
                    workLogUser = await userService.ResolveAuthenticatedUser(email);
                }
                catch (UnauthorizedAccessException ex)
                {
                    logger.LogWarning(ex, "WorkLog user authorization failed for {Email}", email);
                    context.Fail("Unable to authenticate the WorkLog user.");
                    return;
                }
                catch (Exception ex)
                {
                    logger.LogWarning(ex, "Unable to resolve WorkLog user for {Email}", email);
                    context.Fail("Unable to authenticate the WorkLog user.");
                    return;
                }

                if (validatedPrincipal.Identity is ClaimsIdentity identity)
                {
                    identity.AddClaim(new Claim(WorkLogClaimTypes.WorkLogUserId, workLogUser.Id.ToString()));
                    identity.AddClaim(new Claim(WorkLogClaimTypes.UserType, workLogUser.UserType.ToString()));
                    identity.AddClaim(new Claim(WorkLogClaimTypes.Role, workLogUser.Role.ToString()));
                    if (workLogUser.EmployeeId.HasValue)
                        identity.AddClaim(new Claim(WorkLogClaimTypes.EmployeeId, workLogUser.EmployeeId.Value.ToString()));
                    if (workLogUser.CustomerId.HasValue)
                        identity.AddClaim(new Claim(WorkLogClaimTypes.CustomerId, workLogUser.CustomerId.Value.ToString()));
                    if (!string.IsNullOrWhiteSpace(workLogUser.DisplayName))
                        identity.AddClaim(new Claim(ClaimTypes.Name, workLogUser.DisplayName));
                    identity.AddClaim(new Claim(ClaimTypes.Email, workLogUser.Email));
                }
            }
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy =>
        policy.RequireAuthenticatedUser()
            .RequireClaim(WorkLogClaimTypes.UserType, WorkLogUserType.Employee.ToString())
            .RequireClaim(WorkLogClaimTypes.Role, WorkLogUserRole.Admin.ToString()));
});

builder.Services
    .AddControllers()
    .AddNewtonsoftJson(options => options.SerializerSettings.Converters.Add(new StringEnumConverter()));

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
}
else
{
    app.UseExceptionHandler("/Error");
    app.UseHsts();
}

app.UseSerilogRequestLogging();
app.UseStaticFiles();
app.UseHttpsRedirection();
app.UseRouting();
app.UseAuthentication();
app.UseMiddleware(typeof(ExceptionsHandler));
app.UseAuthorization();
app.MapControllers();

var spaRoot = Path.Combine(app.Environment.ContentRootPath, "client-app", "build");

if (Directory.Exists(spaRoot))
{
    var spaFileProvider = new PhysicalFileProvider(spaRoot);
    app.UseDefaultFiles(new DefaultFilesOptions { FileProvider = spaFileProvider });
    app.UseStaticFiles(new StaticFileOptions { FileProvider = spaFileProvider });
    app.MapFallback(async context =>
    {
        context.Response.ContentType = "text/html";
        await context.Response.SendFileAsync(Path.Combine(spaRoot, "index.html"));
    });
}
else
{
    app.MapGet("/", () => Results.Text("SC.WorkLog.WebApp is ready. Run the React app from client-app during development.", "text/plain"));
}

app.Run();

static string GetCognitoAuthority(CognitoSettings settings)
{
    if (!string.IsNullOrWhiteSpace(settings.Authority))
        return settings.Authority;

    if (!string.IsNullOrWhiteSpace(settings.Region) && !string.IsNullOrWhiteSpace(settings.UserPoolId))
        return $"https://cognito-idp.{settings.Region}.amazonaws.com/{settings.UserPoolId}";

    return string.Empty;
}

static bool IsExpectedCognitoClient(ClaimsPrincipal principal, CognitoSettings settings)
{
    if (string.IsNullOrWhiteSpace(settings.ClientId))
        return true;

    var clientId = principal.FindFirstValue("client_id");
    var audience = principal.FindFirstValue("aud");

    return string.Equals(clientId, settings.ClientId, StringComparison.Ordinal)
        || string.Equals(audience, settings.ClientId, StringComparison.Ordinal);
}
