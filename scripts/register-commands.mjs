import { readFile } from "node:fs/promises";

const token = process.env.DISCORD_BOT_TOKEN;
const appId = process.env.DISCORD_APPLICATION_ID;
const guildId = process.env.ALLOWED_GUILD_ID;
if (!token || !appId || !guildId) {
  throw new Error("Set DISCORD_BOT_TOKEN, DISCORD_APPLICATION_ID, and ALLOWED_GUILD_ID before running.");
}
const commands = JSON.parse(await readFile(new URL("../commands.json", import.meta.url), "utf8"));
const response = await fetch(`https://discord.com/api/v10/applications/${appId}/guilds/${guildId}/commands`, {
  method: "PUT",
  headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
  body: JSON.stringify(commands),
});
const result = await response.json();
if (!response.ok) {
  console.error(result);
  process.exitCode = 1;
} else {
  console.log(`Registered ${result.length} guild slash commands:`, result.map(command => command.name).join(", "));
}
