# Week 7 Admin Portal Demo

This folder is the Week 7 Context Engineering demo and lab copy of the Admin Portal from Week 4. Work in `week7/admin-portal`.

## Setup

Mac or Linux:

```sh
cd week7/admin-portal
pnpm install
pnpm typecheck
```

Windows PowerShell:

```powershell
cd week7/admin-portal
pnpm install
pnpm typecheck
```

The checkout has no `docs/` folder on purpose. The demo creates the index and one canonical doc.

The portal needs `ADMIN_TOKEN` only if you run the server. The demo itself uses `pnpm typecheck`.

## Demo Request

Run this request from the course repository root:

```text
In the Admin Portal checkout at week7/admin-portal, study README.md and docs/README.md if it exists. Trace how login and one /admin route handle sessions and access. Use the code and existing checks to verify your findings. Use organize-docs to create or correct the canonical doc and README index for this area. Preserve active plans and open questions. Keep edits to documentation. Show me the evidence, the new files, and the diff, then stop.
```

## Reset

From inside `week7/admin-portal`:

```sh
git checkout -- .
git clean -fd
```

`git clean -fd` removes the docs the demo created and keeps ignored `node_modules`.

Run the reset against a committed baseline. On an untracked copy, `git clean -fd` removes the portal files too.
