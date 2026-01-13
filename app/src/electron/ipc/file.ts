import { ipcMain, app } from "electron";
import fs from "fs/promises";
import path from "path";
import { WorldData } from "../../shared/interface";

const DEFAULT_WORLD_NAME = "world.json"


export function registerWorldIpc() {
  ipcMain.handle("create-world", async (_, playerName: string, worldName: string, worldType: string) => {
    return createWorld(playerName, worldName, worldType);
  });

  ipcMain.handle("list-worlds", async (_, playerName: string) => {
    return listWorlds(playerName);
  });

   ipcMain.handle("delete-world", async (_, playerName: string, worldName: string) => {
    return deleteWorld(playerName, worldName);
  });
}

function returnPlayerPath(playerName: string) {
  return path.join(app.getPath("userData") + "/users/" + playerName, "/worlds");
}

async function createWorld(playerName: string, worldName: string, worldType: string) {
  const playerPath = returnPlayerPath(playerName);
  const worldPath = path.join(playerPath, worldName);

  await fs.mkdir(worldPath, { recursive: true });
  await createWorldFile(worldPath, worldName, worldType)

  return worldPath;
}

async function createWorldFile(worldPath: string, worldName: string, worldType: string) {
  const filePath = path.join(worldPath, DEFAULT_WORLD_NAME);

  const data: WorldData = {
    worldName: worldName,
    worldSeed: crypto.randomUUID(),
    worldCreatedDate: new Date().toISOString(),
    worldType: worldType,
    worldImage: ""
  };

  await fs.writeFile(
    filePath,
    JSON.stringify(data, null, 2),
    "utf-8"
  );

  return filePath;
}

async function listWorlds(playerName: string) {
  const worldPath = returnPlayerPath(playerName);

  const dirs = await fs.readdir(worldPath);
  return (await Promise.all(dirs.map(async d => await fs.readFile(path.join(worldPath, d, DEFAULT_WORLD_NAME), 'utf-8')))).map(f => JSON.parse(f));
}

async function deleteWorld(playerName: string, worldName: string) {
  const playerPath = returnPlayerPath(playerName);
  const worldPath = path.join(playerPath, worldName);

  await fs.rm(worldPath, {
    recursive: true,
    force: true
  });
}

