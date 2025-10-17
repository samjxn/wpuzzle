import React, { useEffect, useMemo, useRef, useState } from "react";
import { useGameContext } from "../game/GameContext";
import type { Board, LetterStatus } from "../game/types";

const formatGuessCount = (count: number): string =>
  `You solved it in ${count} guess${count === 1 ? "" : "es"}`;

const statusToGlyph: Record<Exclude<LetterStatus, "empty">, string> = {
  correct: "🟩",
  present: "🟨",
  absent: "⬛",
};

const buildShareText = (board: Board): string => {
  const rows = board
    .filter((row) => row.some((tile) => tile.revealed))
    .map((row) =>
      row
        .map((tile) => {
          if (!tile.revealed || tile.status === "empty") {
            return "";
          }
          return statusToGlyph[tile.status];
        })
        .join(""),
    )
    .filter((line) => line.length > 0);

  return rows.join("\n");
};

export const EndGameDialog: React.FC = () => {
  const {
    state: { status, activeRow, board },
    stats,
  } = useGameContext();
  const [isOpen, setIsOpen] = useState(false);
  const [hasAutoOpened, setHasAutoOpened] = useState(false);
  const previousStatusRef = useRef(status);
  const [shareError, setShareError] = useState<string | null>(null);
  const [shareSuccess, setShareSuccess] = useState(false);
  const shareTimeoutRef = useRef<number | null>(null);

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

  const winRate = useMemo(() => {
    if (stats.gamesPlayed === 0) {
      return 0;
    }
    return Math.round((stats.gamesWon / stats.gamesPlayed) * 100);
  }, [stats.gamesPlayed, stats.gamesWon]);

  const guessDistributionLines = useMemo(() => {
    const maxCount = stats.guessDistribution.reduce(
      (currentMax, value) => Math.max(currentMax, value),
      0,
    );
    return stats.guessDistribution.map((count, index) => {
      if (maxCount === 0) {
        return { label: `${index + 1}`, count, fillRatio: 0 };
      }
      const baseRatio = count / maxCount;
      const fillRatio =
        count === 0 ? 0 : Math.min(1, Math.max(0.08, baseRatio));
      return { label: `${index + 1}`, count, fillRatio };
    });
  }, [stats.guessDistribution]);

  const message =
    status === "won"
      ? formatGuessCount(activeRow + 1)
      : "Better luck next time";

  const handleShare = async () => {
    setShareError(null);
    setShareSuccess(false);
    if (shareTimeoutRef.current !== null) {
      window.clearTimeout(shareTimeoutRef.current);
      shareTimeoutRef.current = null;
    }
    const shareText = buildShareText(board);

    if (!shareText) {
      setShareError("Nothing to share yet.");
      return;
    }

    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
      setShareError("Clipboard not available.");
      return;
    }

    try {
      await navigator.clipboard.writeText(shareText);
      setShareSuccess(true);
      shareTimeoutRef.current = window.setTimeout(() => {
        setShareSuccess(false);
        shareTimeoutRef.current = null;
      }, 2500);
    } catch {
      setShareError("Unable to copy board.");
    }
  };

  useEffect(
    () => () => {
      if (shareTimeoutRef.current !== null) {
        window.clearTimeout(shareTimeoutRef.current);
        shareTimeoutRef.current = null;
      }
    },
    [],
  );

  useEffect(() => {
    if (!isOpen) {
      setShareError(null);
      setShareSuccess(false);
      if (shareTimeoutRef.current !== null) {
        window.clearTimeout(shareTimeoutRef.current);
        shareTimeoutRef.current = null;
      }
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

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
        <section className="stats-summary" aria-label="Game statistics">
          <div className="stat-card">
            <span className="stat-value">{stats.gamesPlayed}</span>
            <span className="stat-label">Games played</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.gamesWon}</span>
            <span className="stat-label">Games won</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{`${winRate}%`}</span>
            <span className="stat-label">Win rate</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.currentWinStreak}</span>
            <span className="stat-label">Current streak (days)</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.longestWinStreak}</span>
            <span className="stat-label">Longest streak (days)</span>
          </div>
        </section>
        <section
          className="guess-distribution"
          aria-label="Guess distribution"
        >
          <h3 className="distribution-title">Guess distribution</h3>
          <ul className="distribution-list">
            {guessDistributionLines.map(({ label, count, fillRatio }) => (
              <li key={label} className="distribution-item">
                <span className="distribution-label">{label}</span>
                <div className="distribution-bar" aria-hidden="true">
                  <div
                    className="distribution-bar-fill"
                    style={{
                      transform: `scaleX(${fillRatio})`,
                      opacity: count === 0 ? 0.25 : 1,
                    }}
                  />
                </div>
                <span className="distribution-count">{count}</span>
              </li>
            ))}
          </ul>
        </section>
        <div className="dialog-actions">
          <button
            type="button"
            className="dialog-share"
            onClick={handleShare}
            aria-live="polite"
          >
            {shareSuccess ? "Board copied" : "Share board"}
          </button>
          {shareError && (
            <p className="dialog-share-error" role="alert">
              {shareError}
            </p>
          )}
        </div>
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
