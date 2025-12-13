import {
  useUserGlobalState,
  useGlobalNotification,
  useGlobalDeleteModal,
  useGlobalEnterWorldModal,
  useGlobalLoading
} from "../../globalState/GlobalState";
import { Button } from "../components";
import { useEffect, useState } from "react";
import { useGameApi } from "../../api/game/gameApi";
import MiniatureImage from "../../assets/minecraf_miniature.jpg";
import Style from "./ConfigGame.module.css";
import { DeleteModal, EnterWorldModal } from "../components";

const listWorldModes = ["SuperFlat", "Default"];

const MAX_LENGHT_WORLD_NAME = 20;

interface Data {
  worldName: string;
  worldType: string;
}

interface world {
  id: number;
  worldName: string;
  worldType: string;
  worldImage: string;
  worldCreatedDate: string;
}

export const ConfigGame: React.FC = () => {
  const [worldModes, setWorldModes] = useState<string[]>([...listWorldModes]);
  const [worldToDelete, setWorldToDelete] = useState<world>();
  const [worldToEnter, setWorldToEnter] = useState<world>();
  const [data, setData] = useState<Data>({
    worldName: "",
    worldType: "",
  });
  const [listationGames, setListationGames] = useState<world[]>([]);
  const { showDeleteModal, setShowDeleteModal } = useGlobalDeleteModal();
  const { showEnterWorldModal, setShowEnterWorldModal } =
    useGlobalEnterWorldModal();
  const { setLoading } = useGlobalLoading();
  const { setUser } = useUserGlobalState();
  const { createWorld, listWorlds } = useGameApi();
  const { addNotificationMessage } = useGlobalNotification();

  useEffect(() => {
    listWorldsService();
  }, []);

  useEffect(() => {
    if (worldToEnter && !showEnterWorldModal) {
      setShowEnterWorldModal(true);
    }
  }, [worldToEnter]);

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
    if (worldToDelete && !showDeleteModal) {
      setShowDeleteModal(true);
    }
  }, [worldToDelete]);

  useEffect(() => {
    setData({ ...data, worldType: worldModes[worldModes.length - 1] });
  }, [worldModes]);

  const handleChangeGameMode = () => {
    worldModes.pop();
    if (worldModes.length == 0) {
      setWorldModes([...listWorldModes]);
    } else {
      setWorldModes([...worldModes]);
    }
  };

  const createWorldService = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("worldName", data.worldName);
      formData.append("worldType", data.worldType);
      formData.append("worldImage", await convertImageToFile(MiniatureImage));

      await createWorld(formData);

      listWorldsService();

      setData({ ...data, worldName: "" });
    } catch (error) {
      addNotificationMessage({ message: "Error creating World!" });
    }
    setLoading(false);
  };

  const convertImageToFile = async (image: string): Promise<File> => {
    const response = await fetch(image);
    const blob = await response.blob();
    return new File([blob], "minecraft_miniature.jpg", { type: blob.type });
  };

  const listWorldsService = async () => {
    setLoading(true);
    try {
      const response = await listWorlds();

      setListationGames([...response]);
    } catch (error) {
      addNotificationMessage({ message: "Error return user games!" });
    }
    setLoading(false);
  };

  const handleCreateWorld = () => {
    if (
      data.worldName != "" &&
      data.worldName != null &&
      data.worldType != "" &&
      data.worldType != null
    ) {
      createWorldService();
    } else {
      addNotificationMessage({ message: "Invalid credentials!" });
    }
  };

  const handlerValue = (event: any): void => {
    const { value, name } = event.target;

    if (name == "worldName" && value.length > MAX_LENGHT_WORLD_NAME) {
      return;
    }

    setData({ ...data, [name]: value });
  };

  const handleGoBack = () => {
    setUser({
      id: "",
      username: "",
      loged: false,
      token: ""
    });
  };

  return (
    <>
      {worldToDelete ? (
        <DeleteModal
          listWorldsService={listWorldsService}
          worldId={worldToDelete.id}
          worldName={worldToDelete.worldName}
        />
      ) : (
        ""
      )}
      {worldToEnter ? (
        <EnterWorldModal
          worldId={worldToEnter.id}
          worldName={worldToEnter.worldName}
          worldType={worldToEnter.worldType}
        />
      ) : (
        ""
      )}
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
          {listationGames?.map((e, key) => (
            <div
              key={key}
              className={Style.container_config_game_list_worlds_component}
            >
              <div
                className={
                  Style.container_config_game_list_worlds_component_img
                }
                onClick={() => setWorldToEnter(e)}
              >
                <img
                  className={
                    Style.container_config_game_list_worlds_component_img_world
                  }
                  src={e.worldImage}
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
                  {" "}
                  {e.worldName}{" "}
                </span>
                <span id={Style.info_world}> Game mode {e.worldType} </span>
                <span id={Style.info_world}> {e.worldCreatedDate} </span>
              </div>
              <Button
                onClick={() => setWorldToDelete(e)}
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
            {" "}
            Go Back{" "}
          </Button>
          <Button onClick={handleCreateWorld} style={{ width: "45%" }}>
            {" "}
            Create World{" "}
          </Button>
        </div>
      </div>
    </>
  );
};