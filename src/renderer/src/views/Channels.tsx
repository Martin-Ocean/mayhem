import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AppConfig } from "../../../main/config/types";
import type { ChannelOption } from "../../../main/ipc/contract";

interface Props {
  config: AppConfig;
  guilds: Array<{ id: string; name: string }>;
  onSave: (config: AppConfig) => void;
}

export function Channels({ config, guilds, onSave }: Props) {
  const [guildId, setGuildId] = useState(config.guildId ?? "");
  const [textChannelId, setTextChannelId] = useState(config.textChannelId ?? "");
  const [voiceChannelId, setVoiceChannelId] = useState(config.voiceChannelId ?? "");
  const [textChannels, setTextChannels] = useState<ChannelOption[]>([]);
  const [voiceChannels, setVoiceChannels] = useState<ChannelOption[]>([]);

  useEffect(() => {
    if (!guildId) return;
    window.hexAram.listChannels(guildId).then(({ text, voice }) => {
      setTextChannels(text);
      setVoiceChannels(voice);
    });
  }, [guildId]);

  function save() {
    onSave({
      ...config,
      guildId: guildId || undefined,
      textChannelId: textChannelId || undefined,
      voiceChannelId: voiceChannelId || undefined,
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Channels</CardTitle>
        <CardDescription>Pick where announcements get posted and spoken.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="guildSelect">Server</Label>
          <Select id="guildSelect" value={guildId} onChange={(e) => setGuildId(e.target.value)}>
            <option value="">(connect to Discord first)</option>
            {guilds.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="textChannelSelect">Text Channel (announcements)</Label>
          <Select id="textChannelSelect" value={textChannelId} onChange={(e) => setTextChannelId(e.target.value)}>
            <option value="">(none)</option>
            {textChannels.map((c) => (
              <option key={c.id} value={c.id}>
                #{c.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="voiceChannelSelect">Voice Channel (optional -- auto-detect if unset)</Label>
          <Select id="voiceChannelSelect" value={voiceChannelId} onChange={(e) => setVoiceChannelId(e.target.value)}>
            <option value="">(auto-detect)</option>
            {voiceChannels.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>
        <Button onClick={save}>Save Channels</Button>
      </CardContent>
    </Card>
  );
}
