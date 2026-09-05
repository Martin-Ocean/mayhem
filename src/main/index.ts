import { app, BrowserWindow, ipcMain, Menu, nativeImage, Tray } from "electron";
import { join } from "node:path";
import { LcuClient } from "./lcu/client";
import { GameStateMachine } from "./lcu/gameStateMachine";
import { ConfigStore } from "./config/store";
import { SecretsStore, createElectronSafeStorageCodec } from "./config/secrets";
import { BotClient } from "./discord/botClient";
import { StatusBus } from "./statusBus";
import { Pipeline } from "./pipeline";
import { registerIpcHandlers } from "./ipc/handlers";
import type { TestAnnouncementResult } from "./ipc/contract";
import { buildMatchSummary } from "./match/normalize";
import { flattenEogStats } from "./match/fetcher";
import { runHighlightEngine } from "./highlights/engine";
import { createCommentaryGenerator } from "./llm/commentaryGenerator";
import type { RawLcuGame } from "./match/raw";
import type { ChampionMap } from "./match/types";
import { readFileSync } from "node:fs";

// 1x1 transparent PNG -- placeholder tray icon until real artwork exists.
const PLACEHOLDER_ICON_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

// __dirname is dist/src/main at build time -- three levels up is the project root, where
// fixtures/ and src/renderer/ live (the latter is plain HTML/JS, never compiled by tsc).
const resourcesDir = join(__dirname, "..", "..", "..");

function loadChampionMap(): ChampionMap {
  const raw = readFileSync(join(resourcesDir, "fixtures", "champion-map.json"), "utf-8");
  return JSON.parse(raw) as ChampionMap;
}

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      preload: join(__dirname, "..", "preload", "index.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  await mainWindow.loadFile(join(resourcesDir, "src", "renderer", "index.html"));
}

function createTray(): void {
  try {
    const icon = nativeImage.createFromBuffer(Buffer.from(PLACEHOLDER_ICON_BASE64, "base64"));
    tray = new Tray(icon);
    tray.setToolTip("Hex ARAM");
    tray.setContextMenu(
      Menu.buildFromTemplate([
        { label: "Open Settings", click: () => mainWindow?.show() },
        { label: "Quit", click: () => app.quit() },
      ])
    );
  } catch {
    // Tray creation can fail in some environments (e.g. no system tray available) -- not fatal.
  }
}

async function main(): Promise<void> {
  await app.whenReady();

  const userDataDir = app.getPath("userData");
  const configStore = new ConfigStore(join(userDataDir, "config.json"));
  const secretsStore = new SecretsStore(join(userDataDir, "secrets.json"), createElectronSafeStorageCodec());

  const lcu = new LcuClient();
  const initialConfig = await configStore.load();
  const stateMachine = new GameStateMachine(lcu, initialConfig.sentGameIds);
  const botClient = new BotClient();
  const statusBus = new StatusBus();
  const championMap = loadChampionMap();

  new Pipeline({ lcu, stateMachine, configStore, secretsStore, botClient, championMap, statusBus });

  const secrets = await secretsStore.load();
  if (secrets.discordBotToken) {
    await botClient.login(secrets.discordBotToken).catch((err) => statusBus.emit("error", err));
  }
  await lcu.connect().catch((err) => statusBus.emit("error", err));

  async function runTestAnnouncement(): Promise<TestAnnouncementResult> {
    try {
      const config = await configStore.load();
      const secrets = await secretsStore.load();
      const rawGame = JSON.parse(
        readFileSync(join(resourcesDir, "fixtures", "sample-aram-mayhem-match.json"), "utf-8")
      ) as RawLcuGame;
      const rawEog = JSON.parse(
        readFileSync(join(resourcesDir, "fixtures", "sample-eog-stats.json"), "utf-8")
      );
      const eogStats = flattenEogStats(rawEog);
      const summary = buildMatchSummary(rawGame, eogStats, championMap, config.friendMap);
      const highlights = runHighlightEngine(summary);
      const generator = createCommentaryGenerator(
        config.commentarySource === "ai" && secrets.anthropicApiKey
          ? { source: "ai", ai: { apiKey: secrets.anthropicApiKey } }
          : { source: "template" }
      );
      const commentary = await generator.generate({
        summary,
        highlights,
        friendNames: config.friendMap,
        persona: config.persona,
      });
      return { ok: true, ...commentary };
    } catch (err) {
      return { ok: false, error: String(err) };
    }
  }

  registerIpcHandlers({
    ipcMain,
    getWebContents: () => mainWindow?.webContents,
    configStore,
    secretsStore,
    botClient,
    lcu,
    statusBus,
    runTestAnnouncement,
  });

  await createWindow();
  createTray();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow();
  });
}

app.on("window-all-closed", () => {
  // Keep running in the tray on Windows/Linux rather than quitting -- the whole point is to
  // keep detecting games in the background.
  if (process.platform === "darwin") return;
});

void main();
