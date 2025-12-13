import { useEffect, useState } from "react";
import { useUserGlobalState } from "../../globalState/GlobalState";
import {
  LoginRegister,
  ConfigGame,
  Notification,
  Loading,
} from "../components";
import Logo from "../../assets/logo.png";
import Style from "./Home.module.css";

export const Home: React.FC = () => {
  const { user } = useUserGlobalState();
  const [isLogging, setIsLogging] = useState<boolean>(user.loged);

  useEffect(() => {
    setIsLogging(user.loged);
  }, [user]);

  const returnState = () => {
    if (!isLogging) {
      return <LoginRegister />;
    } else {
      return <ConfigGame />;
    }
  };

  return (
    <>
      <Loading />
      <Notification />
      <div className={Style.section_home}>
        <img className={Style.logo} src={Logo} />
        <div className={Style.blur_overlay}></div>
        {returnState()}
      </div>
    </>
  );
};