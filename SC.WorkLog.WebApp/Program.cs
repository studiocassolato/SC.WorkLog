using Microsoft.Extensions.FileProviders;
using Newtonsoft.Json.Converters;
using SC.WorkLog.Application;
using SC.WorkLog.Common.Configuration;
using SC.WorkLog.Common.Exceptions;
using SC.WorkLog.Domain.Interfaces;
using SC.WorkLog.WebApp.Models;
using Serilog;
using Serilog.Events;

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
