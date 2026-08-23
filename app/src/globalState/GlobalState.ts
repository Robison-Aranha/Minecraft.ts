import { create } from "zustand";
import { WorldData } from "../shared/interface";

interface GlobalWorld {
  worldInfo: WorldData;
  setWorldInfo: (worldInfo: WorldData) => void;
}

const storedWorld = localStorage.getItem("world");
const initialWorldState: WorldData = storedWorld
  ? JSON.parse(storedWorld)
  : { worldId: 0, worldName: "", worldType: "" };

const useGlobalWorld = create<GlobalWorld>((set) => ({
  worldInfo: {...initialWorldState},
  setWorldInfo: (worldInfo) => {
    set({ worldInfo: worldInfo });
    localStorage.setItem("world", JSON.stringify(worldInfo));
  },
}));

export {
  useGlobalWorld
};
