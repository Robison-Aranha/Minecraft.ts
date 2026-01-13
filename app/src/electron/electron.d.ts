import { WorldData } from "../shared/interface";

export {};

declare global {
  interface Window {
    api: {
      createWorld: (username:string, worldName: string, worldType: string) => Promise<WorldData>;
      listWorlds: (username: string) => Promise<any>
      deleteWorld:  (username:string, worldName: string) => Promise<void>
    };
  }
}
