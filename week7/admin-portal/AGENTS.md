# Agent Guidelines

- Never return or display password fields.
- Admin routes live under `/admin/` and require the configured admin token or a valid session.
- Render admin pages with Solid.js server-side components.
- Keep the project on TypeScript and pnpm.
- Add endpoint coverage with Node's built-in test runner when adding routes.
