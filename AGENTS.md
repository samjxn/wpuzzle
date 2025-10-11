# Repository Guidelines

## Project Structure & Module Organization

- Vite + React SPA lives in the repo root; `src/main.tsx` mounts the app defined in `src/App.tsx`.
- UI pieces are grouped under `src/components`, core game state under `src/game`, puzzle content in `src/data`, and shared contracts in `src/types`.
- Static assets ship from `public/`; global styles currently reside in `src/styles.css`. Add new theme files alongside their consumers.
- Keep gameplay utilities colocated with their feature module and export through concise index files when shared.

## Build, Test, and Development Commands

- `npm install` (or `npm ci`) syncs dependencies and must run before local work.
- `npm run dev` starts the Vite dev server with fast refresh for rapid iteration.
- `npm run build` performs a full TypeScript check (`tsc --noEmit`) and emits production assets into `dist/`.
- `npm run preview` serves the built bundle for final regression checks before deploying.

## Coding Style & Naming Conventions

- Code is TypeScript-first; match the existing 2-space indentation, single quotes, and trailing semicolons.
- Use PascalCase for components (`LetterKey`), camelCase for hooks/helpers (`useGuessState`), and SCREAMING_SNAKE_CASE for shared constants.
- Prefer function components with hooks; co-locate domain-specific hooks or styles in the same feature directory.
- Keep imports ordered from builtin → third-party → local paths and leverage absolute imports via the `baseUrl` set to `src`.

## Testing Guidelines

- Automated tests are not configured yet; propose adding Vitest + React Testing Library under `src/__tests__`.
- Until the harness exists, document manual validation steps in pull requests and ensure `npm run build` stays green.
- When tests arrive, name files `<module>.spec.ts[x]` and cover edge cases for puzzle validation and keyboard interactions.

## Commit & Pull Request Guidelines

- Git history is clean-slate; adopt Conventional Commit prefixes (`feat: add keyboard hints`) to keep changelog-friendly metadata.
- Keep pull requests tightly scoped, reference related issues, and call out UX changes with screenshots or short clips.
- List manual test steps and any data or configuration files touched so reviewers can reproduce the scenario quickly.

## Security & Configuration Tips

- Never commit proprietary word lists or secrets; store environment-specific values in untracked `.env` files.
- Guard new inputs before mutating shared game state and avoid fetching from external CDNs to keep the app self-hosted.
