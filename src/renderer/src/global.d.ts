import type { HexAramApi } from "../../main/ipc/contract";

declare global {
  interface Window {
    hexAram: HexAramApi;
  }
}

export {};
