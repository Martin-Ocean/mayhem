import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { StatusSnapshot } from "../../../main/ipc/contract";

export function StatusView({ status }: { status: StatusSnapshot | null }) {
  const rows: Array<[string, ReactNode]> = [
    [
      "LCU connection",
      <span key="lcu" className="inline-flex items-center gap-2">
        <span
          className={cn(
            "inline-block h-2 w-2 rounded-full",
            status?.lcuConnected ? "bg-[var(--success)]" : "bg-destructive"
          )}
        />
        {status?.lcuConnected ? "Connected" : "Disconnected"}
      </span>,
    ],
    ["Last phase", status?.lastPhase ?? "-"],
    ["Last announced game", status?.lastAnnouncedGameId ?? "-"],
    ["Last error", status?.lastError ?? "-"],
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Status</CardTitle>
        <CardDescription>Live connection and announcement state.</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-[160px_1fr] gap-y-3 text-sm">
          {rows.map(([label, value]) => (
            <div className="contents" key={label}>
              <dt className="text-muted-foreground">{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
