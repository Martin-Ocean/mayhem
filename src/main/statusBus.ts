import { EventEmitter } from "node:events";
import type { CommentaryResult } from "./llm/types";

export interface StatusEvents {
  lcuConnected: () => void;
  lcuDisconnected: () => void;
  phase: (phase: string) => void;
  announced: (info: { gameId: number; commentary: CommentaryResult }) => void;
  error: (err: unknown) => void;
}

export declare interface StatusBus {
  on<K extends keyof StatusEvents>(event: K, listener: StatusEvents[K]): this;
  emit<K extends keyof StatusEvents>(event: K, ...args: Parameters<StatusEvents[K]>): boolean;
}

/** Renderer subscribes to this over IPC to show connection state / last announcement / errors. */
export class StatusBus extends EventEmitter {}
