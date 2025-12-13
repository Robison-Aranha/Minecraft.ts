import {
  useUserGlobalState,
  useGlobalNotification,
  useGlobalLoading,
} from "../../globalState/GlobalState";
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useLoginRegister } from "../../api/loginRegister/loginRegisterApi";
import { Button } from "../components";
import Style from "./LoginRegister.module.css";

interface Data {
  username: string;
  password: string;
  retypePassword: string;
}

export const LoginRegister: React.FC = () => {
  const location = useLocation();
  const { addNotificationMessage } = useGlobalNotification();
  const { user, setUser } = useUserGlobalState();
  const { setLoading } = useGlobalLoading();
  const [state, setState] = useState<boolean>(true);
  const [data, setData] = useState<Data>({
    username: "",
    password: "",
    retypePassword: "",
  });
  const { login, register } = useLoginRegister();

  useEffect(() => {
    if (location.state == "expired") {
      addNotificationMessage({ message: "Sua sessão expirou!!" });
    } else if (location.state == "logout") {
      addNotificationMessage({ message: "Sessão encerrada!!" });
    }

    setUser({
      id: "",
      username: "",
      loged: false,
      token: ""
    });
  }, []);

  const loginService = async () => {
    setLoading(true);
    try {
      const response = await login(data.username, data.password);

      setUser({
        ...user,
        loged: true,
        id: response.id,
        token: response.token,
      });
    } catch (response) {
      addNotificationMessage({ message: "Login failed!" });
    }
    setLoading(false);
  };

  const registerService = async () => {
    setLoading(true);
    try {
      await register(data.username, data.password);

      setState(true);
      addNotificationMessage({ message: "Account created successfully!" });
    } catch (error: any) {
      try {
        const decodedErrors = JSON.parse(error.response.data.message);
        decodedErrors.forEach((error: any) =>
          addNotificationMessage({ message: error })
        );
      } catch {
        addNotificationMessage({ message: error.response.data.message });
      }
    }

    setLoading(false);
  };

  const verifyCredentials = (): number => {
    if (data.username == "" || data.username == null) {
      return 0;
    }
    if (!state) {
      if (data.retypePassword == "" || data.retypePassword == null) {
        return 1;
      } else {
        if (data.password != data.retypePassword) {
          return 2;
        }
      }
    }
    if (data.password == "" || data.password == null) {
      return 3;
    }

    return 4;
  };

  const handleCommit = (): void => {
    const value = verifyCredentials();

    if (value == 2) {
      addNotificationMessage({ message: "Passwords are not the same!" });
      return;
    } else if (value == 4) {
      if (state == true) {
        loginService();
        return;
      } else {
        registerService();
        return;
      }
    }

    addNotificationMessage({ message: "Invalid Credentials!" });
  };

  const handlerValue = (event: any): void => {
    const { value, name } = event.target;
    setData({ ...data, [name]: value });
  };

  const handleChangeState = () => {
    setState(!state);

    setData({
      username: "",
      password: "",
      retypePassword: "",
    });
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
          <div className={Style.container_top_component}>
            <span>Password:</span>
            <input
              type="password"
              name="password"
              value={data.password}
              onChange={handlerValue}
            />
          </div>
          {!state ? (
            <div className={Style.container_top_component}>
              <span>Retype Password:</span>
              <input
                type="password"
                name="retypePassword"
                value={data.retypePassword}
                onChange={handlerValue}
              />
            </div>
          ) : (
            ""
          )}
        </div>
        <div className={Style.container_bottom}>
          <div className={Style.container_bottom_action}>
            <Button onClick={handleCommit}>
              {state ? "Login" : "Register"}
            </Button>
          </div>
          <span>
            Would you like to{" "}
            <p onClick={handleChangeState}>{state ? "Register" : "Login"}</p> ?
          </span>
        </div>
      </div>
    </>
  );
};