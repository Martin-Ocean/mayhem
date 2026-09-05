import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { TestAnnouncementResult } from "../../../main/ipc/contract";

export function TestAnnouncement() {
  const [result, setResult] = useState<TestAnnouncementResult | null>(null);
  const [running, setRunning] = useState(false);

  async function run() {
    setRunning(true);
    setResult(null);
    const res = await window.hexAram.runTestAnnouncement();
    setResult(res);
    setRunning(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Test Announcement</CardTitle>
        <CardDescription>Runs the full pipeline against a bundled sample match -- no live game required.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={run} disabled={running}>
          {running ? "Running..." : "Run Test Announcement"}
        </Button>
        {result && (
          <div className="rounded-md border bg-muted/40 p-4 text-sm whitespace-pre-wrap">
            {result.ok ? (
              <>
                <p className="font-semibold">Title: {result.title}</p>
                <p className="mt-2 font-medium text-muted-foreground">Embed:</p>
                <p>{result.embedBody}</p>
                <p className="mt-2 font-medium text-muted-foreground">Spoken:</p>
                <p>{result.spokenText}</p>
              </>
            ) : (
              <p className="text-destructive">Failed: {result.error}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
