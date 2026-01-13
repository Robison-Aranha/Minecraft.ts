import Style from "./EnterWorldModal.module.css";
import { useNavigate } from "react-router-dom";
import { useGlobalEnterWorldModal, useGlobalWorld } from "../../../globalState/GlobalState";
import { Button } from "../../components";
import { WorldData } from "../../../shared/interface";

interface ModalProps {
  world: WorldData
}


export const EnterWorldModal: React.FC<ModalProps> = ({ world }) => {
  const { showEnterWorldModal, setShowEnterWorldModal } =
    useGlobalEnterWorldModal();
  const { setWorldInfo } = useGlobalWorld()
  const navigate = useNavigate()


  const enterGameService = () => {
    setWorldInfo({
     ...world
    })
    navigate("/game")
  }

  return (
    <div
      style={{ display: showEnterWorldModal ? "flex" : "none" }}
      className={Style.section_enter_modal}
    >
      <div className={Style.section_container_enter_modal}>
        <div className={Style.text_enter_modal}>
          <span> Deseja mesmo entrar no mundo "{world.worldName}" ? </span>
        </div>
        <div className={Style.action_enter_modal}>
          <Button style={{ width: "40%" }} onClick={enterGameService}> Entrar </Button>
          <Button
            style={{ width: "40%" }}
            onClick={() => setShowEnterWorldModal(false)}
          >
            {" "}
            Voltar{" "}
          </Button>
        </div>
      </div>
    </div>
  );
};