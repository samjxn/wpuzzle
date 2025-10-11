import React from "react";
import { useGameContext } from "../game/GameContext";

export const StatusBar: React.FC = () => {
  const { state } = useGameContext();

  return (
    <section className="status-bar" aria-live="polite">
      <div className="status-message">
        {state.message ?? ""}
      </div>
    </section>
  );
};
