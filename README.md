# SC.WorkLog

Initial skeleton for the internal WorkLog project.

## Solution Structure

- `SC.WorkLog.Common`: shared configuration, settings, helpers and exception middleware.
- `SC.WorkLog.Domain`: domain base types, interfaces, events and future domain folders.
- `SC.WorkLog.Infrastructure`: infrastructure extension points and MongoDB repository scaffolding.
- `SC.WorkLog.Application`: dependency injection, application extension points and shared result types.
- `SC.WorkLog.Api`: minimal ASP.NET Core API host with Serilog, Swagger and health checks.
- `SC.WorkLog.WebApp`: ASP.NET Core host prepared to serve the React SPA.
- `SC.WorkLog.WebApp/client-app`: React 18 + Vite 7 + TypeScript placeholder frontend.
- `SC.WorkLog.Tests`: xUnit test project with a smoke test.

## Build Backend

```powershell
dotnet restore SC.WorkLog.sln
dotnet build SC.WorkLog.sln
```

## Run Backend API

```powershell
dotnet run --project SC.WorkLog.Api
```

Useful endpoints:

- `GET /healthz`
- `GET /api/Demo/GetStatus`
- Swagger UI in Development: `/swagger`

## Run Frontend

```powershell
cd SC.WorkLog.WebApp/client-app
npm install
npm run start
```

The Vite development server runs on `http://localhost:3000`.

To create a production build for the ASP.NET host:

```powershell
cd SC.WorkLog.WebApp/client-app
npm run build
dotnet run --project ../../SC.WorkLog.WebApp
```

## Intentionally Not Implemented Yet

- WorkLog domain entities, dashboards, project detail pages, payments, retainer periods, time entries and reports.
- Real API endpoints beyond health/demo verification.
- AWS Cognito authentication. Only configuration placeholders are present.
- Database models, migrations, repositories specialized for WorkLog or persistence workflows.
- Integration of the v0 prototype UI.
- Background jobs, queue manager and console runner projects.

## Next Phases

1. Define the WorkLog domain model and core use cases.
2. Add application services and DTOs for the first workflow.
3. Introduce persistence details and indexes when the model is stable.
4. Add authentication and current-user claim mapping.
5. Integrate the v0 prototype into the prepared React structure.
6. Expand unit and integration tests around implemented behavior.

## Guideline Deviations

- The solution targets `.NET 10` instead of `.NET 8` because the internal guidelines are dated.
- The current-user abstraction is named `ICurrentUser` instead of the legacy `IPIMUser`.
- `SC.WorkLog.Common` is included because the guidelines require a shared layer even though it was not in the suggested project list.
- `SC.WorkLog.WebApp` is used for the React host instead of `SC.WorkLog.Web` to match the documented convention.
- `QueueManager` and `ConsoleTester` are not created in this phase because no background jobs or manual runners are in scope.
