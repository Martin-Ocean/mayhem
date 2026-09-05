/* global hexAram */

let currentConfig = null;
let currentGuilds = [];

function $(id) {
  return document.getElementById(id);
}

function setupTabs() {
  const buttons = document.querySelectorAll("nav button");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("active"));
      document.querySelectorAll("main section").forEach((s) => s.classList.remove("active"));
      btn.classList.add("active");
      $(btn.dataset.tab).classList.add("active");
    });
  });
}

async function loadConfig() {
  currentConfig = await hexAram.getConfig();

  $("textEnabled").checked = currentConfig.features.textEnabled;
  $("voiceEnabled").checked = currentConfig.features.voiceEnabled;
  $("personaSelect").value = currentConfig.persona;
  $("commentarySourceSelect").value = currentConfig.commentarySource;
  $("ttsProviderSelect").value = currentConfig.ttsProvider ?? "";

  renderFriendRows(currentConfig.friendMap);
}

function renderFriendRows(friendMap) {
  const container = $("friendRows");
  container.innerHTML = "";
  const entries = Object.entries(friendMap ?? {});
  if (entries.length === 0) entries.push(["", ""]);
  for (const [puuid, name] of entries) addFriendRow(puuid, name);
}

function addFriendRow(puuid = "", name = "") {
  const row = document.createElement("div");
  row.className = "row";
  row.innerHTML = `
    <input type="text" placeholder="PUUID" class="puuid" value="${escapeHtml(puuid)}" />
    <input type="text" placeholder="Discord display name" class="name" value="${escapeHtml(name)}" />
    <button type="button" class="remove">x</button>
  `;
  row.querySelector(".remove").addEventListener("click", () => row.remove());
  $("friendRows").appendChild(row);
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function collectFriendMap() {
  const friendMap = {};
  document.querySelectorAll("#friendRows .row").forEach((row) => {
    const puuid = row.querySelector(".puuid").value.trim();
    const name = row.querySelector(".name").value.trim();
    if (puuid && name) friendMap[puuid] = name;
  });
  return friendMap;
}

function populateGuildSelect(guilds) {
  currentGuilds = guilds;
  const select = $("guildSelect");
  select.innerHTML = guilds.map((g) => `<option value="${g.id}">${escapeHtml(g.name)}</option>`).join("");
  if (currentConfig?.guildId) select.value = currentConfig.guildId;
}

async function refreshChannelOptions() {
  const guildId = $("guildSelect").value;
  if (!guildId) return;
  const { text, voice } = await hexAram.listChannels(guildId);

  $("textChannelSelect").innerHTML = text
    .map((c) => `<option value="${c.id}">#${escapeHtml(c.name)}</option>`)
    .join("");
  $("voiceChannelSelect").innerHTML =
    `<option value="">(auto-detect)</option>` +
    voice.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("");

  if (currentConfig?.textChannelId) $("textChannelSelect").value = currentConfig.textChannelId;
  if (currentConfig?.voiceChannelId) $("voiceChannelSelect").value = currentConfig.voiceChannelId;
}

function renderStatus(status) {
  $("statusGrid").innerHTML = `
    <div>LCU connection</div><div><span class="dot ${status.lcuConnected ? "on" : "off"}"></span>${status.lcuConnected ? "Connected" : "Disconnected"}</div>
    <div>Last phase</div><div>${status.lastPhase ?? "-"}</div>
    <div>Last announced game</div><div>${status.lastAnnouncedGameId ?? "-"}</div>
    <div>Last error</div><div>${status.lastError ?? "-"}</div>
  `;
}

async function main() {
  setupTabs();
  await loadConfig();
  renderStatus(await hexAram.getStatus());
  hexAram.onStatusUpdate(renderStatus);

  $("saveTokenBtn").addEventListener("click", async () => {
    await hexAram.setSecrets({ discordBotToken: $("botToken").value });
    $("discordResult").textContent = "Saved.";
  });

  $("testConnBtn").addEventListener("click", async () => {
    $("discordResult").textContent = "Testing...";
    const result = await hexAram.testDiscordConnection();
    if (result.ok) {
      $("discordResult").textContent = `Connected. Servers: ${result.guilds.map((g) => g.name).join(", ")}`;
      populateGuildSelect(result.guilds);
      if (result.guilds.length > 0) await refreshChannelOptions();
    } else {
      $("discordResult").textContent = `Failed: ${result.error}`;
    }
  });

  $("guildSelect").addEventListener("change", refreshChannelOptions);

  $("saveChannelsBtn").addEventListener("click", async () => {
    currentConfig.guildId = $("guildSelect").value || undefined;
    currentConfig.textChannelId = $("textChannelSelect").value || undefined;
    currentConfig.voiceChannelId = $("voiceChannelSelect").value || undefined;
    await hexAram.setConfig(currentConfig);
  });

  $("addFriendRowBtn").addEventListener("click", () => addFriendRow());

  $("saveFriendsBtn").addEventListener("click", async () => {
    currentConfig.friendMap = collectFriendMap();
    await hexAram.setConfig(currentConfig);
  });

  $("saveFeaturesBtn").addEventListener("click", async () => {
    currentConfig.features = {
      textEnabled: $("textEnabled").checked,
      voiceEnabled: $("voiceEnabled").checked,
    };
    currentConfig.persona = $("personaSelect").value;
    currentConfig.commentarySource = $("commentarySourceSelect").value;
    currentConfig.ttsProvider = $("ttsProviderSelect").value || undefined;
    await hexAram.setConfig(currentConfig);
    await hexAram.setSecrets({
      ttsApiKey: $("ttsApiKey").value || undefined,
      anthropicApiKey: $("anthropicApiKey").value || undefined,
    });
  });

  $("runTestBtn").addEventListener("click", async () => {
    $("result").textContent = "Running...";
    const result = await hexAram.runTestAnnouncement();
    $("result").textContent = result.ok
      ? `Title: ${result.title}\n\nEmbed:\n${result.embedBody}\n\nSpoken:\n${result.spokenText}`
      : `Failed: ${result.error}`;
  });
}

main();
