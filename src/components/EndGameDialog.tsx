import React, { useEffect, useRef, useState } from "react";
import { useGameContext } from "../game/GameContext";

const formatGuessCount = (count: number): string =>
  `You solved it in ${count} guess${count === 1 ? "" : "es"}`;

export const EndGameDialog: React.FC = () => {
  const {
    state: { status, activeRow },
  } = useGameContext();
  const [isOpen, setIsOpen] = useState(false);
  const [hasAutoOpened, setHasAutoOpened] = useState(false);
  const previousStatusRef = useRef(status);

  useEffect(() => {
    if (status === "in-progress") {
      setIsOpen(false);
      setHasAutoOpened(false);
      previousStatusRef.current = status;
      return;
    }

    const isFinished = status === "won" || status === "lost";

    if (!isFinished) {
      setHasAutoOpened(false);
      previousStatusRef.current = status;
      return;
    }

    const statusChanged = previousStatusRef.current !== status;
    let timeoutId: number | undefined;

    if (statusChanged) {
      setIsOpen(true);
      setHasAutoOpened(true);
    } else if (!hasAutoOpened) {
      timeoutId = window.setTimeout(() => {
        setIsOpen(true);
        setHasAutoOpened(true);
      }, 400);
    }

    previousStatusRef.current = status;

    return () => {
      if (timeoutId !== undefined) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [status, hasAutoOpened]);

  if (!isOpen) {
    return null;
  }

  const message =
    status === "won"
      ? formatGuessCount(activeRow + 1)
      : "Better luck next time";

  return (
    <div className="dialog-backdrop" role="presentation">
      <div
        className="dialog-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="endgame-dialog-title"
      >
        <h2 id="endgame-dialog-title" className="dialog-title">
          {status === "won" ? "You solved it!" : "Game over"}
        </h2>
        <p className="dialog-message">{message}</p>
        <button
          type="button"
          className="dialog-close"
          onClick={() => setIsOpen(false)}
        >
          Back to game
        </button>
      </div>
    </div>
  );
};
