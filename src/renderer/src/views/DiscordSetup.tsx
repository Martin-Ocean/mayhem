import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DiscordConnectionResult } from "../../../main/ipc/contract";

export function DiscordSetup({ onConnected }: { onConnected: (result: DiscordConnectionResult) => void }) {
  const [token, setToken] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  async function saveToken() {
    await window.hexAram.setSecrets({ discordBotToken: token });
    setMessage("Saved.");
  }

  async function testConnection() {
    setTesting(true);
    setMessage("Testing...");
    const result = await window.hexAram.testDiscordConnection();
    setTesting(false);
    if (result.ok) {
      setMessage(`Connected. Servers: ${result.guilds?.map((g) => g.name).join(", ") || "(none)"}`);
      onConnected(result);
    } else {
      setMessage(`Failed: ${result.error}`);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Discord Bot</CardTitle>
        <CardDescription>Paste the bot token from the Discord Developer Portal.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="botToken">Bot Token</Label>
          <Input
            id="botToken"
            type="password"
            placeholder="Paste your bot token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={saveToken} disabled={!token}>
            Save Token
          </Button>
          <Button variant="secondary" onClick={testConnection} disabled={testing}>
            Test Connection
          </Button>
        </div>
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </CardContent>
    </Card>
  );
}
