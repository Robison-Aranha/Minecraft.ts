import Style from "./deleteModal.module.css";
import {
  useGlobalNotification,
  useGlobalDeleteModal,
  useGlobalLoading,
} from "../../../globalState/GlobalState";
import { useGameApi } from "../../../api/game/gameApi";
import { Button } from "../../components";

interface ModalProps {
  worldId: number;
  worldName: string;
  listWorldsService: () => void;
}

export const DeleteModal: React.FC<ModalProps> = ({
  worldId,
  listWorldsService,
  worldName,
}) => {
  const { showDeleteModal, setShowDeleteModal } = useGlobalDeleteModal();
  const { setLoading } = useGlobalLoading();
  const { deleteWorld } = useGameApi();
  const { addNotificationMessage } = useGlobalNotification();

  const deleteWorldService = async () => {
    setLoading(true);
    try {
      await deleteWorld(worldId);

      listWorldsService();

      setShowDeleteModal(false);
      addNotificationMessage({ message: "World deleted successfully!" });
    } catch (response) {
      addNotificationMessage({ message: "Error deleting game!" });
    }
    setLoading(false);
  };

  return (
    <div
      style={{ display: showDeleteModal ? "flex" : "none" }}
      className={Style.section_delete_modal}
    >
      <div className={Style.section_container_delete_modal}>
        <div className={Style.text_delete_modal}>
          <span> Deseja mesmo deletar o mundo "{worldName}" ? </span>
        </div>
        <div className={Style.action_delete_modal}>
          <Button style={{ width: "40%" }} onClick={deleteWorldService}>
            {" "}
            Deletar{" "}
          </Button>
          <Button
            style={{ width: "40%" }}
            onClick={() => setShowDeleteModal(false)}
          >
            {" "}
            Voltar{" "}
          </Button>
        </div>
      </div>
    </div>
  );
};
