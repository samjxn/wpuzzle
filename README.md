# wpuzzle

Wordle-inspired daily puzzle built with React, TypeScript, and Vite. The app ships with a virtual keyboard, animated board reveals, and persistent player stats so you can self-host your own puzzle feed.

## Features

- Daily puzzle seed driven by the current UTC date with an optional `?date=` override for QA.
- Local storage persistence for in-progress games, streak tracking, and guess distribution analytics.
- Keyboard input and on-screen controls with status highlighting for used letters.
- Share button that copies the emoji grid for posting spoiler-free results.
- Typed state management via `GameContext` with reducer-driven actions for submit, reveal, and reset flows.

## Quick Start

```bash
npm install
npm run dev
```

The Vite dev server boots at `http://localhost:5173` with fast refresh enabled.

## Scripts

- `npm run dev` — Launch Vite in development mode.
- `npm run build` — Run a type-check (`tsc --noEmit`) and emit the production bundle.
- `npm run preview` — Serve the contents of `dist/` for smoke testing the production build.

Run `npm run build` before submitting changes to ensure TypeScript stays green.

## Gameplay Notes

- Use your keyboard or click the on-screen keys; the Enter and Backspace actions are available in both places.
- Completed boards open the end-game dialog automatically, summarizing stats and showing guess distribution bars.
- Click **Share board** to copy the spoiler-free emoji grid—only revealed tiles are included.
- Progress, stats, and streaks are saved locally per browser using versioned storage keys.

## Daily Puzzle Overrides

Append `?date=YYYY-MM-DD` or any parseable date string to preview a specific day's puzzle, e.g.:

```
http://localhost:5173/?date=2024-01-15
```

When omitted, gameplay is anchored to the current day.

## Customizing Word Lists

- Replace the default placeholder data in `src/data/5_answers.txt` (solutions) and `src/data/5_words.txt` (allowed guesses) with your curated word sets.
- `src/data/dictionary.ts` handles parsing both files, deduping entries, and selecting a deterministic solution per day.
- Keep both lists uppercase-friendly and one word per line; the build step imports them with Vite's `?raw` loader.

## Project Structure

- `src/App.tsx` — Mounts the game shell and composes the board, status bar, and keyboard.
- `src/components/` — Presentational React components with minimal state (`Board`, `Keyboard`, `StatusBar`, `EndGameDialog`).
- `src/game/` — Typed game state, reducer actions, persistence helpers, and stats calculations.
- `src/data/` — Dictionary files and helpers for validating guesses and picking daily solutions.
- `src/utils/` — Shared utilities such as `referenceDate` for query-param overrides.
- `src/styles.css` — Global styles and animation keyframes; extend or customize theme tokens here.
- `public/` — Static assets served as-is (favicons, manifest).

## Local Development Tips

- Use `npm run preview` to regression-test the production bundle before deployment.
- Use `?debug=true` to print the answer to the console.
- Document manual validation steps (date override scenarios, win/loss flows, share button) when opening PRs.
- Consider adding Vitest + React Testing Library under `src/__tests__/` if you need automated coverage.
