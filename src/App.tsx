import React from "react";
import { GameProvider } from "./game/GameContext";
import { Board } from "./components/Board";
import { Keyboard } from "./components/Keyboard";
import { StatusBar } from "./components/StatusBar";
import { EndGameDialog } from "./components/EndGameDialog";

const App: React.FC = () => (
  <GameProvider>
    <div className="app-shell">
      <header className="app-header">
        <h1>this is a word puzzle.</h1>
      </header>
      <main className="app-main">
        <Board />
        <StatusBar />
        <Keyboard />
      </main>
      <EndGameDialog />
    </div>
  </GameProvider>
);

export default App;
