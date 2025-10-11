import React from "react";
import { useGameContext } from "../game/GameContext";

export const Board: React.FC = () => {
  const { state } = useGameContext();
  const rows = state.board;

  return (
    <section className="board" aria-label="Game board">
      {rows.map((row, rowIndex) => (
        <div className="board-row" key={`row-${rowIndex}`}>
          {row.map((tile, tileIndex) => (
            <div
              className={`tile tile-${tile.status}`}
              data-status={tile.status}
              data-revealed={tile.revealed}
              key={`tile-${rowIndex}-${tileIndex}`}
            >
              <span className="tile-face tile-front">{tile.letter}</span>
              <span className="tile-face tile-back">{tile.letter}</span>
            </div>
          ))}
        </div>
      ))}
    </section>
  );
};
