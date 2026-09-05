import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AppConfig } from "../../../main/config/types";

interface Row {
  puuid: string;
  name: string;
}

function toRows(friendMap: Record<string, string>): Row[] {
  const entries = Object.entries(friendMap);
  return entries.length > 0 ? entries.map(([puuid, name]) => ({ puuid, name })) : [{ puuid: "", name: "" }];
}

interface Props {
  config: AppConfig;
  onSave: (config: AppConfig) => void;
}

export function Friends({ config, onSave }: Props) {
  const [rows, setRows] = useState<Row[]>(toRows(config.friendMap));

  function updateRow(index: number, field: keyof Row, value: string) {
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }

  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  function save() {
    const friendMap: Record<string, string> = {};
    for (const row of rows) {
      if (row.puuid.trim() && row.name.trim()) friendMap[row.puuid.trim()] = row.name.trim();
    }
    onSave({ ...config, friendMap });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Friends</CardTitle>
        <CardDescription>Map each friend's League PUUID to their Discord display name.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((row, i) => (
          <div key={i} className="flex gap-2">
            <Input
              placeholder="PUUID"
              value={row.puuid}
              onChange={(e) => updateRow(i, "puuid", e.target.value)}
            />
            <Input
              placeholder="Discord display name"
              value={row.name}
              onChange={(e) => updateRow(i, "name", e.target.value)}
            />
            <Button variant="outline" size="icon" onClick={() => removeRow(i)}>
              ×
            </Button>
          </div>
        ))}
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setRows((prev) => [...prev, { puuid: "", name: "" }])}>
            + Add Friend
          </Button>
          <Button onClick={save}>Save Friends</Button>
        </div>
      </CardContent>
    </Card>
  );
}
