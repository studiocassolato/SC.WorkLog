# WorkLog v0 Frontend Porting Note

## Copied Almost Directly

- `components/ui/*` shadcn/Radix primitives.
- `components/status-badges.tsx`, dialogs, sheets and work item detail sheet.
- `lib/mock-data.ts`, `lib/worklog-context.tsx` and `lib/utils.ts`.
- v0 Tailwind global theme from `styles/globals.css`, with primary color kept red for the real WorkLog UI requirement.

## Adapted From Next.js

- `components/app-shell.tsx` now uses `react-router-dom` links and location instead of `next/link` and `usePathname`.
- `components/app-layout.tsx` now uses `useHistory` instead of `useRouter`.
- `app/(app)/*/page.tsx` files were copied into `src/views/<ViewName>` and converted from Next routing hooks to React Router hooks.
- Dynamic routes use `/projects/:id` and `/work-items/:id` in the real Vite app.

## Dependencies Added

- Tailwind 4, `@tailwindcss/vite`, `tw-animate-css`.
- Radix/shadcn dependencies used by the prototype.
- `react-router-dom@5`, `lucide-react`, `date-fns`, `sonner`, `recharts`, `react-hook-form` and supporting UI packages.

## Destination Folders

- Pure shared UI: `src/components` and `src/components/ui`.
- Mock data/context/utilities: `src/lib`.
- Routed pages: `src/views`.
- Routing adapter: `src/components/Routes`.
- Global v0 styling: `src/assets/theme/main.css`.

## Not Ported Blindly

- Next.js `app` folder, `layout.tsx`, root `page.tsx`, metadata/font APIs and route handlers were not copied into the real app.
- Backend/API/auth/database integration remains mocked and intentionally absent.
