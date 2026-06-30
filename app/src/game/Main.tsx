import { useEffect, useState, useRef } from "react";
import { Game } from "./components/Game";
import { useGlobalWorld } from "../globalState/GlobalState";
import { hashStringToSeed } from "./components/utils/Utils";

const GameFunction: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [game] = useState<Game>(new Game(3, mountRef));
  const [useStats] = useState<boolean>(true);
  const { worldInfo } = useGlobalWorld();

  useEffect(() => {
    game.setSeed(hashStringToSeed(worldInfo.worldSeed))
    game.setupGame();
    game.setupPlayer();
    game.setupWorld();
    if (useStats) {
      game.setUpStats();
    }
    game.resizeService();
    game.setPointingArrow();
    game.render();
  }, []);

  return (
    <div id="main" ref={mountRef} />
  );
};

export default GameFunction;
