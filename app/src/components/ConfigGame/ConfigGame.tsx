import { useEffect, useState } from "react";
import {
  useGlobalWorld
} from "../../globalState/GlobalState";
import Logo from "../../assets/logo.png";
import { Button } from "../components";
import Style from "./ConfigGame.module.css";
import { WorldData } from "../../shared/interface";
import { useNavigate } from "react-router-dom";

const listWorldModes = ["SuperFlat", "Default"];


export const ConfigGame: React.FC = () => {
  const [worldModes, setWorldModes] = useState<string[]>([...listWorldModes]);
  const [data, setData] = useState<WorldData>({
    worldType: listWorldModes[listWorldModes.length - 1],
    worldSeed: crypto.randomUUID()
  });
  const { setWorldInfo } = useGlobalWorld();
  const navigate = useNavigate();

  useEffect(() => {
    setData((prev) => ({
      ...prev,
      worldType: worldModes[worldModes.length - 1],
    }));
  }, [worldModes]);

  const handleChangeGameMode = () => {
    setWorldModes((prev) => {
      const next = [...prev];
      next.pop();
      return next.length === 0 ? [...listWorldModes] : next;
    });
  };

  const createWorldService = async () => {
    setWorldInfo({
      worldSeed: crypto.randomUUID(),
      worldType: data.worldType,
    });
    navigate("/game");
  };

  const handleCreateWorld = () => {
    createWorldService();
  };

  return (
    <>
      <div className={Style.section_home}>
        <img className={Style.logo} src={Logo} />
        <div className={Style.blur_overlay}></div>
      </div>
      <div className={Style.container_config_game}>
        <div className={Style.container_config_game_configuration}>
          <Button onClick={handleCreateWorld}>
            Create World
          </Button>
          <Button onClick={handleChangeGameMode}>
            Game Mode: {data.worldType}
          </Button>
        </div>
      </div>
    </>
  );
};
