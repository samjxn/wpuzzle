# wpuzzle Wordle Clone

TypeScript SPA scaffold for a self-hosted Wordle-style puzzle game powered by Vite and React.

## Getting Started

```bash
npm install
npm run dev
```

The development server runs at `http://localhost:5173` by default.

## Available Scripts

- `npm run dev` — start Vite in development mode with hot module replacement.
- `npm run build` — type-check the project and create an optimized production build.
- `npm run preview` — serve the production build locally for smoke testing.

## Project Structure

- `src/` — React components, game state management, and styles.
  - `components/` — UI building blocks such as the board, keyboard, and status bar.
  - `game/` — Wordle engine logic (context, reducer, utilities).
  - `data/` — Placeholder dictionary and helpers for managing word lists.
- `public/` — Static assets served as-is (favicon, manifest, etc.).
- `index.html` — Root HTML template loaded by Vite.
- `vite.config.ts` — Build configuration for Vite with React SWC plugin.

## Next Steps

- Replace `src/data/dictionary.ts` with your curated word lists and persistence strategy.
- Extend `src/game/GameContext.tsx` to support additional gameplay options (daily puzzles, endless mode, multiplayer).
- Style the UI to match your brand and add responsive/animation polish.
