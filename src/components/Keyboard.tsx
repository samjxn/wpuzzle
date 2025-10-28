import React, { useEffect } from "react";
import { useGameContext } from "../game/GameContext";

const KEY_ROWS = [
  { id: "top", keys: "QWERTYUIOP" },
  { id: "home", keys: "ASDFGHJKL" },
  { id: "bottom", keys: "ZXCVBNM" },
] as const;

const ASSET_BASE = import.meta.env.BASE_URL ?? "/";

const COMMAND_KEYS = {
  ENTER: {
    icon: `${ASSET_BASE}enter.svg`,
    label: "Enter",
  },
  BACKSPACE: {
    icon: `${ASSET_BASE}backspace.svg`,
    label: "Backspace",
  },
} as const;

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

  const renderCommandKey = (key: keyof typeof COMMAND_KEYS) => {
    const { icon, label } = COMMAND_KEYS[key];
    return (
      <button
        type="button"
        key={key}
        className="key key-command"
        onClick={() => handleKeyClick(key)}
        aria-label={label}
      >
        <span className="sr-only">{label}</span>
        <img
          className="key-command-icon"
          src={icon}
          alt=""
          aria-hidden="true"
          loading="lazy"
        />
      </button>
    );
  };

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
      {KEY_ROWS.map(({ id, keys }) => (
        <div className="keyboard-row" data-row={id} key={id}>
          {id === "bottom" && renderCommandKey("ENTER")}
          {keys.split("").map(renderKey)}
          {id === "bottom" && renderCommandKey("BACKSPACE")}
        </div>
      ))}
    </section>
  );
};
