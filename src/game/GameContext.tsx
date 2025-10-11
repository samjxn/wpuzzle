import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import {
  pickRandomSolution,
  isValidGuess,
  getPuzzleDay,
} from "../data/dictionary";
import type {
  Board,
  GameAction,
  GameContextValue,
  GameState,
  LetterStatus,
  Tile,
} from "./types";

const WORD_LENGTH = 5;
const MAX_TURNS = 6;
const REVEAL_DELAY_MS = 250;
const STORAGE_KEY = "wpuzzle:game-state";
const STORAGE_VERSION = 1;

type PersistedGameSnapshot = {
  version: number;
  day: number;
  state: GameState;
};

const sanitizeStateForPersistence = (state: GameState): GameState => ({
  ...state,
  isRevealing: false,
  pendingGuess: null,
  pendingStatuses: null,
  revealIndex: 0,
  revealRow: null,
});

const loadPersistedState = (solution: string, day: number): GameState | null => {
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
  const resolvedSolution = (solution ?? pickRandomSolution()).toUpperCase();
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

enum TileStatus {
  correct = "correct",
  present = "present",
}

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
          message:
            state.cursor < WORD_LENGTH ? "Not enough letters." : state.message,
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
    default:
      return state;
  }
};

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  let initialPuzzleDay = 0;
  const [state, dispatch] = useReducer(reducer, undefined, () => {
    const referenceDate = new Date();
    const solution = pickRandomSolution(referenceDate);
    initialPuzzleDay = getPuzzleDay(referenceDate);
    const persisted = loadPersistedState(solution, initialPuzzleDay);
    return persisted ?? createInitialState(solution);
  });
  const puzzleDayRef = useRef(initialPuzzleDay);

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
    puzzleDayRef.current = getPuzzleDay();
  }, [state.solution]);

  useEffect(() => {
    if (state.isRevealing) {
      return;
    }
    persistState(state, puzzleDayRef.current);
  }, [state]);

  const value = useMemo(() => ({ state, dispatch }), [state, dispatch]);
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

export const useGameContext = (): GameContextValue => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGameContext must be used within a GameProvider");
  }
  return context;
};

export const getWordLength = () => WORD_LENGTH;
export const getMaxTurns = () => MAX_TURNS;
