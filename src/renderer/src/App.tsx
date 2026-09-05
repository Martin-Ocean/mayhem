import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DiscordSetup } from "./views/DiscordSetup";
import { Channels } from "./views/Channels";
import { Friends } from "./views/Friends";
import { Features } from "./views/Features";
import { TestAnnouncement } from "./views/TestAnnouncement";
import { StatusView } from "./views/StatusView";
import type { AppConfig } from "../../main/config/types";
import type { StatusSnapshot } from "../../main/ipc/contract";

export default function App() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [guilds, setGuilds] = useState<Array<{ id: string; name: string }>>([]);
  const [status, setStatus] = useState<StatusSnapshot | null>(null);

  useEffect(() => {
    window.hexAram.getConfig().then(setConfig);
    window.hexAram.getStatus().then(setStatus);
    const unsubscribe = window.hexAram.onStatusUpdate(setStatus);
    return unsubscribe;
  }, []);

  async function saveConfig(next: AppConfig) {
    setConfig(next);
    await window.hexAram.setConfig(next);
  }

  if (!config) {
    return <div className="p-8 text-sm text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b px-6 py-4">
        <h1 className="text-lg font-semibold">Hex ARAM</h1>
      </header>
      <main className="mx-auto max-w-2xl p-6">
        <Tabs defaultValue="discord">
          <TabsList>
            <TabsTrigger value="discord">Discord Setup</TabsTrigger>
            <TabsTrigger value="channels">Channels</TabsTrigger>
            <TabsTrigger value="friends">Friends</TabsTrigger>
            <TabsTrigger value="features">Features</TabsTrigger>
            <TabsTrigger value="test">Test</TabsTrigger>
            <TabsTrigger value="status">Status</TabsTrigger>
          </TabsList>

          <TabsContent value="discord">
            <DiscordSetup onConnected={(result) => setGuilds(result.guilds ?? [])} />
          </TabsContent>
          <TabsContent value="channels">
            <Channels config={config} guilds={guilds} onSave={saveConfig} />
          </TabsContent>
          <TabsContent value="friends">
            <Friends config={config} onSave={saveConfig} />
          </TabsContent>
          <TabsContent value="features">
            <Features config={config} onSave={saveConfig} />
          </TabsContent>
          <TabsContent value="test">
            <TestAnnouncement />
          </TabsContent>
          <TabsContent value="status">
            <StatusView status={status} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
