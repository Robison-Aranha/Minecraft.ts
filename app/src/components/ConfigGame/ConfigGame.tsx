import { useCallback, useEffect, useState } from "react";
import MiniatureImage from "../../assets/minecraf_miniature.jpg";
import {
  useGlobalDeleteModal,
  useGlobalEnterWorldModal,
  useGlobalLoading,
  useGlobalNotification,
  useUserGlobalState,
} from "../../globalState/GlobalState";
import { WorldData } from "../../shared/interface";
import { Button, DeleteModal, EnterWorldModal } from "../components";
import Style from "./ConfigGame.module.css";

const listWorldModes = ["SuperFlat", "Default"];
const MAX_LENGHT_WORLD_NAME = 20;

interface Data {
  worldName: string;
  worldType: string;
}

export const ConfigGame: React.FC = () => {
  const [worldModes, setWorldModes] = useState<string[]>([...listWorldModes]);
  const [worldToDelete, setWorldToDelete] = useState<WorldData>();
  const [worldToEnter, setWorldToEnter] = useState<WorldData>();
  const [data, setData] = useState<Data>({
    worldName: "",
    worldType: listWorldModes[listWorldModes.length - 1],
  });
  const [listationGames, setListationGames] = useState<WorldData[]>([]);

  const { showDeleteModal, setShowDeleteModal } = useGlobalDeleteModal();
  const { showEnterWorldModal, setShowEnterWorldModal } =
    useGlobalEnterWorldModal();
  const { setLoading } = useGlobalLoading();
  const { user, setUser } = useUserGlobalState();
  const { addNotificationMessage } = useGlobalNotification();

  const listWorldsService = useCallback(async () => {
    setLoading(true);
    try {
      const worlds = await window.api.listWorlds(user.username);
      setListationGames([...worlds]);
    } catch {
      addNotificationMessage({ message: "Error return user games!" });
    }
    setLoading(false);
  }, [user.username, setLoading, addNotificationMessage]);

  useEffect(() => {
    listWorldsService();
  }, [listWorldsService]);

  useEffect(() => {
    if (!showEnterWorldModal) {
      setWorldToEnter(undefined);
    }
  }, [showEnterWorldModal]);

  useEffect(() => {
    if (!showDeleteModal) {
      setWorldToDelete(undefined);
    }
  }, [showDeleteModal]);

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
    setLoading(true);
    try {
      await window.api.createWorld(
        user.username,
        data.worldName,
        data.worldType,
      );
      await listWorldsService();
      setData((prev) => ({ ...prev, worldName: "" }));
    } catch {
      addNotificationMessage({ message: "Error creating World!" });
    }
    setLoading(false);
  };

  const handleCreateWorld = () => {
    if (data.worldName && data.worldType) {
      createWorldService();
    } else {
      addNotificationMessage({ message: "Invalid credentials!" });
    }
  };

  const handlerValue = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value, name } = event.target;

    if (name === "worldName" && value.length > MAX_LENGHT_WORLD_NAME) {
      return;
    }

    setData((prev) => ({ ...prev, [name]: value }));
  };

  const handleGoBack = () => {
    setUser({
      username: "",
    });
  };

  const handleEnterWorld = (world: WorldData) => {
    setWorldToEnter(world);
    setShowEnterWorldModal(true);
  };

  const handleDeleteWorld = (world: WorldData) => {
    setWorldToDelete(world);
    setShowDeleteModal(true);
  };

  return (
    <>
      {worldToDelete && (
        <DeleteModal
          world={worldToDelete}
          listWorldsService={listWorldsService}
        />
      )}
      {worldToEnter && <EnterWorldModal world={worldToEnter} />}
      <div className={Style.container_config_game}>
        <div className={Style.container_config_game_configuration}>
          <span>World's name:</span>
          <input
            name="worldName"
            value={data.worldName}
            onChange={handlerValue}
          />
          <Button onClick={handleChangeGameMode}>
            Game Mode: {data.worldType}
          </Button>
        </div>
        <div className={Style.container_config_game_list_worlds}>
          {listationGames.map((e, key) => (
            <div
              key={key}
              className={Style.container_config_game_list_worlds_component}
            >
              <div
                className={
                  Style.container_config_game_list_worlds_component_img
                }
                onClick={() => handleEnterWorld(e)}
              >
                <img
                  className={
                    Style.container_config_game_list_worlds_component_img_world
                  }
                  src={
                    e.worldImage && e.worldImage !== ""
                      ? e.worldImage
                      : MiniatureImage
                  }
                />
                <span
                  className={
                    Style.container_config_game_list_worlds_component_play
                  }
                >
                  Play
                </span>
              </div>
              <div
                className={
                  Style.container_config_game_list_worlds_component_text
                }
              >
                <span
                  className={
                    Style.container_config_game_list_worlds_component_text_world_name
                  }
                >
                  {e.worldName}
                </span>
                <span id={Style.info_world}>Game mode {e.worldType}</span>
                <span id={Style.info_world}>{e.worldCreatedDate}</span>
              </div>
              <Button
                onClick={() => handleDeleteWorld(e)}
                style={{ width: "25%", height: "40%" }}
              >
                Delete
              </Button>
              <div
                className={
                  Style.container_config_game_list_worlds_component_delete
                }
              ></div>
            </div>
          ))}
        </div>
        <div className={Style.container_config_game_action}>
          <Button onClick={handleGoBack} style={{ width: "45%" }}>
            Go Back
          </Button>
          <Button onClick={handleCreateWorld} style={{ width: "45%" }}>
            Create World
          </Button>
        </div>
      </div>
    </>
  );
};
