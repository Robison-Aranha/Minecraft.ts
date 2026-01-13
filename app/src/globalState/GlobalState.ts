import { create } from "zustand";
import { WorldData } from "../shared/interface";

interface UserState {
  username: string;
}

interface UserGlobalState {
  user: UserState;
  setUser: (user: UserState) => void;
}

interface GlobalNotificationMessage {
  message: string;
}

interface GlobalNotification {
  messages: GlobalNotificationMessage[];
  addNotificationMessage: (message: GlobalNotificationMessage) => void;
  removeNotificationMessage: () => void;
}

interface GlobalLoading {
  isLoading: boolean;
  setLoading: (isLoading: boolean) => void;
}

interface GlobalDeleteModal {
  showDeleteModal: boolean;
  setShowDeleteModal: (showDeleteModal: boolean) => void;
}

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

interface GlobalEnterWorldModal {
  showEnterWorldModal: boolean;
  setShowEnterWorldModal: (showEnterWorldModal: boolean) => void;
}

const useGlobalEnterWorldModal = create<GlobalEnterWorldModal>((set) => ({
  showEnterWorldModal: false,
  setShowEnterWorldModal: (showEnterWorldModal) => {
    set({ showEnterWorldModal: showEnterWorldModal });
  },
}));

const useGlobalDeleteModal = create<GlobalDeleteModal>((set) => ({
  showDeleteModal: false,
  setShowDeleteModal: (showDeleteModal) => {
    set({ showDeleteModal: showDeleteModal });
  },
}));

const useGlobalLoading = create<GlobalLoading>((set) => ({
  isLoading: false,
  setLoading: (isLoading) => {
    set({ isLoading: isLoading });
  },
}));

const useGlobalNotification = create<GlobalNotification>((set) => ({
  messages: [],
  addNotificationMessage: (message) =>
    set((state) => ({ messages: [...state.messages, message] })),
  removeNotificationMessage: () =>
    set((state) => ({
      messages: [...state.messages.slice(1, state.messages.length)],
    })),
}));

const storedUser = localStorage.getItem("user");
const initialUserState: UserState = storedUser
  ? JSON.parse(storedUser)
  : { username: "" };

const useUserGlobalState = create<UserGlobalState>((set) => ({
  user: { ...initialUserState },
  setUser: (user) => {
    set({ user });
    localStorage.setItem("user", JSON.stringify(user));
  },
}));

export {
  useGlobalNotification,
  useUserGlobalState,
  useGlobalLoading,
  useGlobalDeleteModal,
  useGlobalEnterWorldModal,
  useGlobalWorld
};
