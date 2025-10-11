import React, { useEffect } from "react";
import { useGameContext } from "../game/GameContext";

const KEY_ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];

export const Keyboard: React.FC = () => {
  const { state, dispatch } = useGameContext();

  const handleKeyClick = (key: string) => {
    if (key === "ENTER") {
      dispatch({ type: "submit" });
    } else if (key === "BACKSPACE") {
      dispatch({ type: "backspace" });
    } else {
      dispatch({ type: "key", payload: key });
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        event.preventDefault();
        dispatch({ type: "submit" });
        return;
      }
      if (event.key === "Backspace") {
        event.preventDefault();
        dispatch({ type: "backspace" });
        return;
      }
      if (/^[a-zA-Z]$/.test(event.key)) {
        event.preventDefault();
        dispatch({ type: "key", payload: event.key });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dispatch]);

  const renderKey = (key: string) => {
    const upperKey = key.toUpperCase();
    const status = state.usedLetters[upperKey] ?? "empty";
    return (
      <button
        type="button"
        key={upperKey}
        className={`key key-${status}`}
        onClick={() => handleKeyClick(upperKey)}
      >
        {upperKey}
      </button>
    );
  };

  return (
    <section className="keyboard" aria-label="Virtual keyboard">
      {KEY_ROWS.map((row) => (
        <div className="keyboard-row" key={row}>
          {row === "ZXCVBNM" && (
            <button
              type="button"
              className="key key-command"
              onClick={() => handleKeyClick("BACKSPACE")}
            >
              Backspace
            </button>
          )}
          {row.split("").map(renderKey)}
          {row === "ZXCVBNM" && (
            <button
              type="button"
              className="key key-command"
              onClick={() => handleKeyClick("ENTER")}
            >
              Enter
            </button>
          )}
        </div>
      ))}
    </section>
  );
};
