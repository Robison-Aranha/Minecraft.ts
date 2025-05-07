import { useEffect, useState, useRef } from "react";
import { Game } from "./components/Game";

const GameFunction: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [game] = useState<Game>(new Game(1, mountRef));
  const [useStats] = useState<boolean>(true);

  useEffect(() => {
    game.setupGame(); 
    game.setupWorld();
    game.setupPLayer();
    if (useStats) {
      game.setUpStats();
    }
    game.resizeService();
    game.render();
  }, []);

  return (
    <div id="main" ref={mountRef} />
  );
};

export default GameFunction;
