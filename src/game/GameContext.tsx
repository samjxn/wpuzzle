import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import {
  pickRandomSolution,
  isValidGuess,
  getPuzzleDay,
} from "../data/dictionary";
import { getReferenceDate } from "../utils/referenceDate";
import type {
  Board,
  GameAction,
  GameContextValue,
  GameState,
  GameStats,
  LetterStatus,
  Tile,
} from "./types";

const WORD_LENGTH = 5;
const MAX_TURNS = 6;
const REVEAL_DELAY_MS = 250;
const STORAGE_KEY = "wpuzzle:game-state";
const STORAGE_VERSION = 1;
const STATS_STORAGE_KEY = "wpuzzle:stats";
const STATS_STORAGE_VERSION = 1;

type PersistedGameSnapshot = {
  version: number;
  day: number;
  state: GameState;
};

type PersistedStatsSnapshot = {
  version: number;
  data: GameStats;
};

const sanitizeStateForPersistence = (state: GameState): GameState => ({
  ...state,
  isRevealing: false,
  pendingGuess: null,
  pendingStatuses: null,
  revealIndex: 0,
  revealRow: null,
});

const loadPersistedState = (
  solution: string,
  day: number,
): GameState | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as PersistedGameSnapshot;
    if (
      parsed == null ||
      parsed.version !== STORAGE_VERSION ||
      parsed.day !== day
    ) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    if (!parsed.state || parsed.state.solution !== solution) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return sanitizeStateForPersistence(parsed.state);
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
};

const persistState = (state: GameState, day: number): void => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const payload: PersistedGameSnapshot = {
      version: STORAGE_VERSION,
      day,
      state: sanitizeStateForPersistence(state),
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage write failures (e.g., quota exceeded or privacy mode)
  }
};

const createInitialStats = (): GameStats => ({
  gamesPlayed: 0,
  gamesWon: 0,
  currentWinStreak: 0,
  longestWinStreak: 0,
  lastCompletedDay: null,
  lastCompletedOutcome: null,
  guessDistribution: [0, 0, 0, 0, 0, 0],
});

const loadPersistedStats = (): GameStats => {
  if (typeof window === "undefined") {
    return createInitialStats();
  }

  try {
    const raw = window.localStorage.getItem(STATS_STORAGE_KEY);
    if (!raw) {
      return createInitialStats();
    }

    const parsed = JSON.parse(raw) as PersistedStatsSnapshot;
    if (
      parsed == null ||
      parsed.version !== STATS_STORAGE_VERSION ||
      parsed.data == null
    ) {
      window.localStorage.removeItem(STATS_STORAGE_KEY);
      return createInitialStats();
    }

    const { data } = parsed;
    if (!Array.isArray(data?.guessDistribution)) {
      return createInitialStats();
    }
    if (data.guessDistribution.length !== 6) {
      return createInitialStats();
    }

    const guessDistribution = [
      data.guessDistribution[0] ?? 0,
      data.guessDistribution[1] ?? 0,
      data.guessDistribution[2] ?? 0,
      data.guessDistribution[3] ?? 0,
      data.guessDistribution[4] ?? 0,
      data.guessDistribution[5] ?? 0,
    ] as GameStats["guessDistribution"];

    const base: GameStats = {
      ...createInitialStats(),
      ...data,
      guessDistribution,
    };

    const longest =
      typeof base.longestWinStreak === "number" &&
      Number.isFinite(base.longestWinStreak)
        ? base.longestWinStreak
        : 0;

    return {
      ...base,
      longestWinStreak: longest,
    };
  } catch {
    window.localStorage.removeItem(STATS_STORAGE_KEY);
    return createInitialStats();
  }
};

const persistStats = (stats: GameStats): void => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const payload: PersistedStatsSnapshot = {
      version: STATS_STORAGE_VERSION,
      data: stats,
    };
    window.localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage write failures (e.g., quota exceeded or privacy mode)
  }
};

const GameContext = createContext<GameContextValue | undefined>(undefined);

const createEmptyRow = (): Tile[] =>
  Array.from({ length: WORD_LENGTH }, () => ({
    letter: "",
    status: "empty" as const,
    revealed: false,
  }));

const createEmptyBoard = (): Board =>
  Array.from({ length: MAX_TURNS }, createEmptyRow);

const createInitialState = (solution?: string): GameState => {
  const resolvedSolution = (
    solution ?? pickRandomSolution(getReferenceDate())
  ).toUpperCase();
  return {
    board: createEmptyBoard(),
    activeRow: 0,
    cursor: 0,
    status: "in-progress",
    solution: resolvedSolution,
    message: null,
    usedLetters: {},
    isRevealing: false,
    pendingGuess: null,
    pendingStatuses: null,
    revealIndex: 0,
    revealRow: null,
  };
};

const evaluateGuess = (guess: string, solution: string): LetterStatus[] => {
  const solutionChars = solution.split("");
  const statuses: LetterStatus[] = Array(WORD_LENGTH).fill("absent");
  const available: Record<string, number> = {};

  solutionChars.forEach((char) => {
    available[char] = (available[char] ?? 0) + 1;
  });

  // First pass: correct letters
  for (let i = 0; i < WORD_LENGTH; i += 1) {
    if (guess[i] === solution[i]) {
      statuses[i] = "correct";
      available[guess[i]] -= 1;
    }
  }

  // Second pass: present letters
  for (let i = 0; i < WORD_LENGTH; i += 1) {
    const char = guess[i];
    if (statuses[i] === "correct") continue;

    if (available[char] > 0) {
      statuses[i] = "present";
      available[char] -= 1;
    }
  }

  return statuses;
};

const mergeLetterStatus = (
  current: LetterStatus | undefined,
  incoming: LetterStatus,
): LetterStatus => {
  if (incoming === "correct") {
    return "correct";
  }
  if (incoming === "present") {
    return current === "correct" ? "correct" : "present";
  }
  if (!current || current === "empty") {
    return "absent";
  }
  return current;
};

const reducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case "key": {
      if (
        state.status !== "in-progress" ||
        state.cursor >= WORD_LENGTH ||
        state.isRevealing
      ) {
        return state;
      }
      const letter = action.payload.toUpperCase();
      if (!/^[A-Z]$/.test(letter)) {
        return state;
      }

      const board = state.board.map((row, rowIndex) =>
        rowIndex === state.activeRow
          ? row.map((tile, colIndex) =>
              colIndex === state.cursor
                ? { ...tile, letter, revealed: false, status: "empty" as const }
                : tile,
            )
          : row,
      );

      return {
        ...state,
        board,
        cursor: state.cursor + 1,
        message: null,
      };
    }
    case "backspace": {
      if (
        state.status !== "in-progress" ||
        state.cursor === 0 ||
        state.isRevealing
      ) {
        return state;
      }

      const targetIndex = state.cursor - 1;

      const board = state.board.map((row, rowIndex) =>
        rowIndex === state.activeRow
          ? row.map((tile, colIndex) =>
              colIndex === targetIndex
                ? {
                    ...tile,
                    letter: "",
                    status: "empty" as const,
                    revealed: false,
                  }
                : tile,
            )
          : row,
      );

      return {
        ...state,
        board,
        cursor: targetIndex,
        message: null,
      };
    }
    case "submit": {
      if (state.status !== "in-progress" || state.isRevealing) {
        return state;
      }

      if (state.cursor < WORD_LENGTH) {
        return {
          ...state,
          message: "Not enough letters.",
        };
      }

      const guess = state.board[state.activeRow]
        .map((tile) => tile.letter)
        .join("");
      if (!isValidGuess(guess)) {
        return {
          ...state,
          message: "Word not in dictionary.",
        };
      }
      const statuses = evaluateGuess(guess, state.solution);
      return {
        ...state,
        message: null,
        isRevealing: true,
        pendingGuess: guess,
        pendingStatuses: statuses,
        revealIndex: 0,
        revealRow: state.activeRow,
      };
    }
    case "reset": {
      return createInitialState(action.payload?.solution);
    }
    case "reveal-next": {
      if (
        !state.isRevealing ||
        state.pendingStatuses == null ||
        state.pendingGuess == null ||
        state.revealRow == null
      ) {
        return state;
      }

      if (state.revealIndex >= state.pendingStatuses.length) {
        return state;
      }

      const tileIndex = state.revealIndex;
      const status = state.pendingStatuses[tileIndex];
      const board = state.board.map((row, rowIndex) => {
        if (rowIndex !== state.revealRow) {
          return row;
        }
        return row.map((tile, colIndex) =>
          colIndex === tileIndex ? { ...tile, status, revealed: true } : tile,
        );
      });

      const letter = state.pendingGuess[tileIndex];
      const usedLetters = { ...state.usedLetters };
      if (letter) {
        const nextStatus = mergeLetterStatus(usedLetters[letter], status);
        usedLetters[letter] = nextStatus;
      }

      return {
        ...state,
        board,
        usedLetters,
        revealIndex: tileIndex + 1,
      };
    }
    case "reveal-complete": {
      if (
        !state.isRevealing ||
        state.pendingStatuses == null ||
        state.pendingGuess == null
      ) {
        return state;
      }

      const hasWon = state.pendingStatuses.every(
        (status) => status === "correct",
      );
      const hasMoreRows = state.activeRow + 1 < state.board.length;
      const nextStatus: GameState["status"] = hasWon
        ? "won"
        : hasMoreRows
          ? "in-progress"
          : "lost";
      const nextActiveRow =
        hasWon || !hasMoreRows ? state.activeRow : state.activeRow + 1;

      return {
        ...state,
        isRevealing: false,
        pendingGuess: null,
        pendingStatuses: null,
        revealIndex: 0,
        revealRow: null,
        activeRow: nextActiveRow,
        cursor: hasWon || !hasMoreRows ? state.cursor : 0,
        status: nextStatus,
        message: hasWon
          ? "You solved it!"
          : !hasMoreRows && !hasWon
            ? state.solution
            : null,
      };
    }
    case "set-message": {
      return {
        ...state,
        message: action.payload,
      };
    }
    default:
      return state;
  }
};

const updateStatsWithResult = (
  stats: GameStats,
  day: number,
  outcome: "won" | "lost",
  guessCount: number,
): GameStats => {
  if (
    stats.lastCompletedDay === day &&
    stats.lastCompletedOutcome === outcome
  ) {
    return stats;
  }

  if (stats.lastCompletedDay === day) {
    return stats;
  }

  const gamesPlayed = stats.gamesPlayed + 1;
  const gamesWon = outcome === "won" ? stats.gamesWon + 1 : stats.gamesWon;

  const guessDistribution = [
    ...stats.guessDistribution,
  ] as GameStats["guessDistribution"];

  if (outcome === "won") {
    const clampedIndex = Math.max(1, Math.min(6, guessCount)) - 1;
    guessDistribution[clampedIndex] += 1;
  }

  let currentWinStreak: number;
  let longestWinStreak = stats.longestWinStreak;
  if (outcome === "won") {
    const isConsecutiveWin =
      stats.lastCompletedDay != null &&
      day === stats.lastCompletedDay + 1 &&
      stats.lastCompletedOutcome === "won";
    currentWinStreak = isConsecutiveWin ? stats.currentWinStreak + 1 : 1;

    if (stats.lastCompletedDay != null && day > stats.lastCompletedDay + 1) {
      currentWinStreak = 1;
    }

    if (currentWinStreak > longestWinStreak) {
      longestWinStreak = currentWinStreak;
    }
  } else {
    currentWinStreak = 0;
  }

  return {
    gamesPlayed,
    gamesWon,
    currentWinStreak,
    longestWinStreak,
    lastCompletedDay: day,
    lastCompletedOutcome: outcome,
    guessDistribution,
  };
};

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const referenceDate = useMemo(() => getReferenceDate(), []);
  const initialPuzzleDay = useMemo(
    () => getPuzzleDay(referenceDate),
    [referenceDate],
  );
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    const solution = pickRandomSolution(referenceDate);
    const persisted = loadPersistedState(solution, initialPuzzleDay);
    return persisted ?? createInitialState(solution);
  });
  const [stats, setStats] = useState<GameStats>(() => loadPersistedStats());
  const puzzleDayRef = useRef(initialPuzzleDay);
  const previousStatusRef = useRef(state.status);
  const hasLoggedSolutionRef = useRef(false);

  useEffect(() => {
    if (!state.isRevealing || state.pendingStatuses == null) {
      return undefined;
    }

    if (state.revealIndex >= state.pendingStatuses.length) {
      return undefined;
    }

    if (state.revealIndex > 0) {
      const timer = window.setTimeout(() => {
        dispatch({ type: "reveal-next" });
      }, REVEAL_DELAY_MS);
      return () => window.clearTimeout(timer);
    } else {
      dispatch({ type: "reveal-next" });
    }
  }, [state.isRevealing, state.pendingStatuses, state.revealIndex, dispatch]);

  useEffect(() => {
    if (
      !state.isRevealing ||
      state.pendingStatuses == null ||
      state.revealIndex !== state.pendingStatuses.length
    ) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      dispatch({ type: "reveal-complete" });
    }, REVEAL_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, [state.isRevealing, state.pendingStatuses, state.revealIndex, dispatch]);

  useEffect(() => {
    puzzleDayRef.current = getPuzzleDay(referenceDate);
  }, [referenceDate, state.solution]);

  useEffect(() => {
    if (state.isRevealing) {
      return;
    }
    persistState(state, puzzleDayRef.current);
  }, [state]);

  useEffect(() => {
    persistStats(stats);
  }, [stats]);

  useEffect(() => {
    if (hasLoggedSolutionRef.current || typeof window === "undefined") {
      return;
    }

    hasLoggedSolutionRef.current = true;
    const params = new URLSearchParams(window.location.search);
    if (params.get("debug")?.toLowerCase() === "true") {
      console.info(`[wpuzzle] Today's solution: ${state.solution}`);
    }
  }, [state.solution]);

  useEffect(() => {
    const previousStatus = previousStatusRef.current;
    const currentStatus = state.status;
    if (previousStatus === currentStatus) {
      return;
    }

    if (currentStatus === "won" || currentStatus === "lost") {
      const activeRowIndex =
        state.status === "won"
          ? state.activeRow
          : Math.min(state.activeRow, MAX_TURNS - 1);
      const guessCount = activeRowIndex + 1;
      const day = puzzleDayRef.current;
      setStats((currentStats) =>
        updateStatsWithResult(currentStats, day, currentStatus, guessCount),
      );
    }

    previousStatusRef.current = currentStatus;
  }, [state.status, state.activeRow]);

  const value = useMemo(
    () => ({ state, dispatch, stats }),
    [state, dispatch, stats],
  );
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

export const useGameContext = (): GameContextValue => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGameContext must be used within a GameProvider");
  }
  return context;
};
