# CI/CD Setup (GitHub Actions + Vercel)

## What is included

- `.github/workflows/ci.yml`
- `.github/workflows/deploy-vercel.yml`

`ci.yml` runs:
- Frontend matrix: `lint`, `typecheck`, `test`, `build`
- Backend matrix: `lint`, `typecheck`, `test`, `build`

Current project state:
- `typecheck` and `build` are real checks.
- `lint` scripts are placeholders (explicit no-op logs) until lint rules are added.
- `backend test` runs Node test suites in `backend/tests/**/*.test.cjs`.
- `frontend test` is currently a placeholder script until a frontend test suite is added.

`deploy-vercel.yml` runs production deploy for `frontend/` when:
- `CI` workflow completes successfully on branch `main`
- Or when triggered manually via `workflow_dispatch`

The deploy workflow has `concurrency` enabled (`vercel-production`) so only one production deploy can run at a time.

## Required GitHub repository secrets

Add these in `Settings -> Secrets and variables -> Actions`:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

## One-time setup to get Vercel IDs

1. Install Vercel CLI locally: `npm i -g vercel`
2. Login: `vercel login`
3. In `frontend/`, link project (if not linked yet): `vercel link`
4. Read IDs from `frontend/.vercel/project.json`:
   - `orgId` -> `VERCEL_ORG_ID`
   - `projectId` -> `VERCEL_PROJECT_ID`

## Environment variable safety

- `backend/.env` is ignored by git.
- Use `backend/.env.example` as the template for local/backend runtime config.
- Never store real keys in tracked files.

## Rollback and deploy control

If a production deploy is bad:

1. Open Vercel project -> `Deployments`.
2. Pick the last known good deployment.
3. Click `Promote to Production` to roll back immediately.
4. Re-run `CI` on GitHub for the fixing commit, then merge to `main` for a normal forward deploy.

If you need to pause automated release temporarily:

- Disable the `Deploy Frontend to Vercel` workflow in GitHub Actions.
- Re-enable after the hotfix is validated.
