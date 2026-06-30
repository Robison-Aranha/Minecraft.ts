import { useEffect, useState } from "react";
import {
  useGlobalNotification,
  useUserGlobalState,
} from "../../globalState/GlobalState";
import { Button } from "../components";
import Style from "./LoginRegister.module.css";

interface Data {
  username: string;
}

export const LoginRegister: React.FC = () => {
  const { addNotificationMessage } = useGlobalNotification();
  const { setUser } = useUserGlobalState();
  const [data, setData] = useState<Data>({
    username: "",
  });

  useEffect(() => {
    setUser({
      username: "",
    });
  });

  const handleCommit = (): void => {
    if (data.username == "" || data.username == null) {
      addNotificationMessage({ message: "Invalid Credentials!" });
      return;
    }
    setUser({
      username: data.username,
    });
  };

  const handlerValue = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const { value, name } = event.target;
    setData({ ...data, [name]: value });
  };

  return (
    <>
      <div className={Style.container_login_register}>
        <div className={Style.container_top}>
          <div className={Style.container_top_component}>
            <span>Username:</span>
            <input
              name="username"
              value={data.username}
              onChange={handlerValue}
            />
          </div>
        </div>
        <div className={Style.container_bottom}>
          <div className={Style.container_bottom_action}>
            <Button onClick={handleCommit}>Jogar</Button>
          </div>
        </div>
      </div>
    </>
  );
};
