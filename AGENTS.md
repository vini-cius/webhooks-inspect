# Codex Agent Guide

This repository is a pnpm workspace with two packages:

- `api/`: Fastify REST API using TypeScript, Drizzle ORM, and PostgreSQL
- `web/`: React + Vite front end

Follow the guidance below whenever you work on this project as Codex.

## Getting Set Up

- Use Node.js 20+ and pnpm `10.19.0` (pinned in `package.json`)
- Copy `api/.env.example` to `api/.env` if present; otherwise ask before creating one
- Start the PostgreSQL container from `api/` with `docker compose up -d`
- Run `pnpm install` at the repo root before touching code

## Day-to-Day Workflow

- Read existing changes first; never revert unrelated edits
- Prefer `rg` for searches and `pnpm` scripts for lifecycle commands
- When editing, stay in ASCII unless the file already contains other encodings
- For multi-step work, communicate a plan and keep it updated after each step

## Coding Standards

- API code is TypeScript; format with `pnpm --filter api format`
- Front end uses React + Vite; format with `pnpm --filter web format`
- Keep database changes in sync with Drizzle (`db:generate`, `db:migrate`)
- Document new endpoints in Swagger (Fastify decorators) when applicable
- Add focused comments only when logic is non-obvious

## Verification Checklist

- API: run targeted scripts such as `pnpm --filter api dev` or `db:seed` when relevant
- Web: use `pnpm --filter web dev` for manual QA; `pnpm --filter web build` before merging
- If seeds or migrations change, ensure they succeed on a fresh database
- Summarize what changed, call out risks, and suggest next actions in the final message

## Communication Notes

- Be concise, collaborative, and reference files with clickable paths (`file:line`)
- Suggest natural next steps (tests, commits) when they exist; otherwise skip
- Never expose full command output—summarize what matters
- Escalate questions immediately if requirements or existing changes are unclear
