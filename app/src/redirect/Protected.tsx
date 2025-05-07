import { useGlobalWorld } from "../globalState/GlobalState";
import { Route, Routes } from "react-router-dom";
import { Navigate } from "react-router-dom";
import GameFunction from "../game/Main";

export const Protected: React.FC = () => {
  const { worldInfo } = useGlobalWorld();

  return worldInfo ? (
    <Routes>
      <Route path="/game" element={ <GameFunction /> } />
      <Route path="*" element={<Navigate to="/game" />} />
    </Routes>
  ) : (
    <Navigate to="/" />
  );
};
