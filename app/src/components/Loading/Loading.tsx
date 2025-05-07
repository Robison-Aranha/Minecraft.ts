import { useGlobalLoading } from "../../globalState/GlobalState";
import Style from "./Loading.module.css"

export const Loading = () => {
    const { isLoading } = useGlobalLoading();
  
    return (
      <div style={{ display: (isLoading ? "flex" : "none") }} className={Style.loading_section}>
        <div className={Style.loading_loader}></div>
      </div>
    );
  };