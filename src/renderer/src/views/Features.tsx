import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AppConfig } from "../../../main/config/types";

interface Props {
  config: AppConfig;
  onSave: (config: AppConfig) => void;
}

export function Features({ config, onSave }: Props) {
  const [textEnabled, setTextEnabled] = useState(config.features.textEnabled);
  const [voiceEnabled, setVoiceEnabled] = useState(config.features.voiceEnabled);
  const [persona, setPersona] = useState(config.persona);
  const [commentarySource, setCommentarySource] = useState(config.commentarySource);
  const [ttsProvider, setTtsProvider] = useState(config.ttsProvider ?? "");
  const [ttsApiKey, setTtsApiKey] = useState("");
  const [anthropicApiKey, setAnthropicApiKey] = useState("");

  async function save() {
    onSave({
      ...config,
      features: { textEnabled, voiceEnabled },
      persona,
      commentarySource,
      ttsProvider: (ttsProvider || undefined) as AppConfig["ttsProvider"],
    });
    if (ttsApiKey || anthropicApiKey) {
      await window.hexAram.setSecrets({
        ttsApiKey: ttsApiKey || undefined,
        anthropicApiKey: anthropicApiKey || undefined,
      });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Features</CardTitle>
        <CardDescription>Persona, commentary source, and delivery toggles.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between">
          <Label htmlFor="textEnabled">Text announcements</Label>
          <Switch id="textEnabled" checked={textEnabled} onCheckedChange={setTextEnabled} />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="voiceEnabled">Voice announcements (TTS)</Label>
          <Switch id="voiceEnabled" checked={voiceEnabled} onCheckedChange={setVoiceEnabled} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="personaSelect">Persona</Label>
          <Select id="personaSelect" value={persona} onChange={(e) => setPersona(e.target.value as typeof persona)}>
            <option value="roast">Roast</option>
            <option value="hypeCaster">Hype Caster</option>
            <option value="deadpan">Deadpan</option>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="commentarySourceSelect">Commentary Source</Label>
          <Select
            id="commentarySourceSelect"
            value={commentarySource}
            onChange={(e) => setCommentarySource(e.target.value as typeof commentarySource)}
          >
            <option value="template">Template (default)</option>
            <option value="ai">AI (not yet implemented)</option>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ttsProviderSelect">TTS Provider</Label>
          <Select id="ttsProviderSelect" value={ttsProvider} onChange={(e) => setTtsProvider(e.target.value)}>
            <option value="">(none)</option>
            <option value="elevenlabs">ElevenLabs</option>
            <option value="google">Google Cloud TTS</option>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ttsApiKey">TTS API Key</Label>
          <Input
            id="ttsApiKey"
            type="password"
            placeholder="Paste your TTS provider API key"
            value={ttsApiKey}
            onChange={(e) => setTtsApiKey(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="anthropicApiKey">Anthropic API Key (for AI commentary, once implemented)</Label>
          <Input
            id="anthropicApiKey"
            type="password"
            placeholder="sk-..."
            value={anthropicApiKey}
            onChange={(e) => setAnthropicApiKey(e.target.value)}
          />
        </div>

        <Button onClick={save}>Save Features</Button>
      </CardContent>
    </Card>
  );
}
