# Simple Fast API with Rules

A TypeScript and Hono rewrite of the user CRUD API and its admin portal. The admin pages are rendered with Solid.js on the server. User data remains in the SQLite database at `users.db`.

## Requirements

- Node.js 22.23.1 and pnpm 12.15.0 (both are pinned by the project)

## Run locally

```sh
pnpm install
pnpm dev
```

The server listens at http://localhost:8000. For a production build:

```sh
pnpm build
pnpm start
```

Set `ADMIN_TOKEN` in the environment or in a `.env` file in the project directory to enable the admin portal. Generate a token with:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

The portal stays closed while the token is unset. Passwords are stored as salted scrypt hashes and are never included in API responses or rendered pages.

## API

The public endpoints support user CRUD:

| Method | Path | Result |
| --- | --- | --- |
| `GET` | `/users/` | List users |
| `GET` | `/users/{user_id}` | Read a user |
| `POST` | `/users/` | Create a user (`name`, `email`, `password`) |
| `PUT` | `/users/{user_id}` | Update a user (`name`, `email`) |
| `DELETE` | `/users/{user_id}` | Delete a user |

The HTML admin portal is at `/admin/`. Sign in at `/admin/login` with the configured token. Its user management forms support creating, editing, resetting a password, and deleting users.

The admin JSON API is under `/admin/api/users`. Send the admin token in `X-Admin-Token` or `Authorization: Bearer <token>`. A valid browser session cookie also authorizes these endpoints.

| Method | Path | Result |
| --- | --- | --- |
| `GET` | `/admin/api/users?q=&skip=0&limit=100` | Search and paginate users |
| `POST` | `/admin/api/users` | Create a user |
| `GET` | `/admin/api/users/{user_id}` | Read a user |
| `PUT` | `/admin/api/users/{user_id}` | Update a user |
| `DELETE` | `/admin/api/users/{user_id}` | Delete a user |
| `POST` | `/admin/api/users/{user_id}/password` | Set a password |

Interactive API docs are available at `/docs` and `/redoc`; the OpenAPI document is at `/openapi.json`.

## License

This project is licensed under the GPL-3.0 License. See [LICENSE](LICENSE) for details.
