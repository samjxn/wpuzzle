import type { Dispatch } from "react";

export type LetterStatus = "correct" | "present" | "absent" | "empty";

export interface Tile {
  letter: string;
  status: LetterStatus;
  revealed: boolean;
}

export type Board = Tile[][];

export type GameStatus = "in-progress" | "won" | "lost";

export interface GameState {
  board: Board;
  activeRow: number;
  cursor: number;
  status: GameStatus;
  solution: string;
  message: string | null;
  usedLetters: Record<string, LetterStatus>;
  isRevealing: boolean;
  pendingGuess: string | null;
  pendingStatuses: LetterStatus[] | null;
  revealIndex: number;
  revealRow: number | null;
}

export type GameAction =
  | { type: "key"; payload: string }
  | { type: "backspace" }
  | { type: "submit" }
  | { type: "reset"; payload?: { solution?: string } }
  | { type: "reveal-next" }
  | { type: "reveal-complete" };

export interface GameContextValue {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}
