/**
 * NoteSMP event-driven Discord interactions Worker.
 * No persistent Gateway connection is used.
 */
const encoder = new TextEncoder();

const REGISTERED_COMMANDS = [
  { name: "help", description: "Show NoteSMP bot help" },
  { name: "access", description: "Manage authorized website administrators", options: [
    { type: 1, name: "add", description: "Grant access to a Discord user or role", options: [{ type: 9, name: "target", description: "User or role to authorize", required: true }] },
    { type: 1, name: "remove", description: "Remove access from a Discord user or role", options: [{ type: 9, name: "target", description: "User or role to remove", required: true }] },
    { type: 1, name: "list", description: "List authorized users and roles" }
  ] },
  { name: "link", description: "Manage website links", options: [
    { type: 1, name: "set", description: "Set a website link", options: [
      { type: 3, name: "key", description: "Which link", required: true, choices: ["discord","youtube","modpack","bluemap"].map(value => ({ name: value, value })) },
      { type: 3, name: "url", description: "Full http(s) URL", required: true }
    ] },
    { type: 1, name: "unset", description: "Remove a website link", options: [
      { type: 3, name: "key", description: "Which link", required: true, choices: ["discord","youtube","modpack","bluemap"].map(value => ({ name: value, value })) }
    ] }
  ] },
  { name: "sync", description: "Enable automatic website publishing from a channel", options: [
    { type: 3, name: "category", description: "Content category", required: true, choices: [{ name: "rules", value: "rules" }, { name: "updates", value: "updates" }] },
    { type: 7, name: "channel", description: "Discord source channel", required: true }
  ] },
  { name: "unsync", description: "Disable automatic website publishing", options: [
    { type: 3, name: "category", description: "Content category", required: true, choices: [{ name: "rules", value: "rules" }, { name: "updates", value: "updates" }] }
  ] }
];


async function verifyDiscordRequest(request, body, publicKey) {
  const signature = request.headers.get("X-Signature-Ed25519");
  const timestamp = request.headers.get("X-Signature-Timestamp");
  if (!signature || !timestamp || typeof publicKey !== "string" || !publicKey.trim()) return false;
  const seconds = Number(timestamp);
  if (!Number.isFinite(seconds) || Math.abs(Date.now() / 1000 - seconds) > 300) return false;
  if (!/^[0-9a-fA-F]{64}$/.test(publicKey) || !/^[0-9a-fA-F]{128}$/.test(signature)) return false;
  try {
    const key = await crypto.subtle.importKey("raw", Uint8Array.from(publicKey.match(/.{2}/g), v => parseInt(v, 16)), { name: "Ed25519" }, false, ["verify"]);
    return await crypto.subtle.verify("Ed25519", key, Uint8Array.from(signature.match(/.{2}/g), v => parseInt(v, 16)), encoder.encode(timestamp + body));
  } catch { return false; }
}
function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
}
function respond(content, ephemeral = true, embed = null) {
  return json({ type: 4, data: { ...(embed ? { embeds: [embed] } : { content }), ...(ephemeral ? { flags: 64 } : {}), allowed_mentions: { parse: [] } } });
}
function optionsMap(options = []) {
  const result = {};
  for (const option of options) {
    result[option.name] = option.value ?? option.user ?? option.role ?? option.channel;
    if (option.options) result[option.name] = optionsMap(option.options);
  }
  return result;
}
function memberRoles(interaction) {
  return interaction.member?.roles || [];
}
async function isOwner(env, userId) {
  return Boolean(env.OWNER_DISCORD_ID && userId === env.OWNER_DISCORD_ID);
}
async function hasAdminAccess(env, interaction) {
  if (await isOwner(env, interaction.member?.user?.id || interaction.user?.id)) return true;
  const userId = interaction.member?.user?.id || interaction.user?.id;
  const roles = memberRoles(interaction);
  const user = await env.DB.prepare("SELECT 1 FROM access_entries WHERE entry_type='user' AND discord_id=?").bind(userId).first();
  if (user) return true;
  for (const roleId of roles) {
    const found = await env.DB.prepare("SELECT 1 FROM access_entries WHERE entry_type='role' AND discord_id=?").bind(roleId).first();
    if (found) return true;
  }
  return false;
}
async function handle(interaction, env) {
  const command = interaction.data?.name;
  const args = optionsMap(interaction.data?.options);
  const userId = interaction.member?.user?.id || interaction.user?.id;
  if (command === "help") {
    return respond(null, true, { title: "NoteSMP Bot", description: "Event-driven bot connected. Use the available commands to manage NoteSMP." });
  }
  if (command === "access") {
    if (!(await isOwner(env, userId))) return respond("Only the configured bot owner can manage access.");
    const sub = args.add ? "add" : args.remove ? "remove" : "list";
    if (sub === "list") {
      const rows = await env.DB.prepare("SELECT entry_type, discord_id FROM access_entries ORDER BY entry_type, discord_id").all();
      const lines = (rows.results || []).map(r => r.entry_type === "user" ? `User: <@${r.discord_id}>` : `Role: <@&${r.discord_id}>`);
      return respond(lines.length ? lines.join("\\n") : "No additional access entries are configured.");
    }
    const target = args[sub]?.target;
    if (!target) return respond("Select a user or role.");
    const id = target?.id || target;
    const resolved = interaction.data?.resolved || {};
    const type = target?.role || resolved.roles?.[id] ? "role" : "user";
    if (sub === "add") {
      await env.DB.prepare("INSERT OR IGNORE INTO access_entries(entry_type,discord_id,added_by) VALUES(?,?,?)").bind(type, id, userId).run();
      return respond(`Added ${type} access for ${type === "role" ? `<@&${id}>` : `<@${id}>`}.`);
    }
    await env.DB.prepare("DELETE FROM access_entries WHERE entry_type=? AND discord_id=?").bind(type, id).run();
    return respond(`Removed ${type} access.`);
  }
  if (["link", "sync", "unsync"].includes(command)) {
    if (!(await hasAdminAccess(env, interaction))) return respond("You don’t have permission to manage website content.");
    if (command === "link") {
      if (args.set) {
        const key = args.set.key;
        const url = args.set.url;
        if (!["discord", "youtube", "modpack", "bluemap"].includes(key) || !/^https?:\\/\\//i.test(url || "")) return respond("Choose a supported link key and provide a valid http(s) URL.");
        await env.DB.prepare("INSERT INTO website_links(link_key,url,updated_by) VALUES(?,?,?) ON CONFLICT(link_key) DO UPDATE SET url=excluded.url,updated_by=excluded.updated_by,updated_at=CURRENT_TIMESTAMP").bind(key, url, userId).run();
        return respond(`Updated website link: **${key}**.`);
      }
      const key = args.unset?.key;
      if (!["discord", "youtube", "modpack", "bluemap"].includes(key)) return respond("Choose discord, youtube, modpack, or bluemap.");
      await env.DB.prepare("DELETE FROM website_links WHERE link_key=?").bind(key).run();
      return respond(`Unset website link: **${key}**.`);
    }
    if (command === "sync") {
      const category = args.category;
      const channelId = args.channel;
      if (!["rules", "updates"].includes(category) || !channelId) return respond("Choose rules or updates and provide a channel.");
      await env.DB.prepare("INSERT INTO channel_sync(category,channel_id,configured_by) VALUES(?,?,?) ON CONFLICT(category) DO UPDATE SET channel_id=excluded.channel_id,configured_by=excluded.configured_by,updated_at=CURRENT_TIMESTAMP").bind(category, channelId, userId).run();
      return respond(`Automatic ${category} sync configured for <#${channelId}>.`);
    }
    const category = args.category;
    if (!["rules", "updates"].includes(category)) return respond("Choose rules or updates.");
    await env.DB.prepare("DELETE FROM channel_sync WHERE category=?").bind(category).run();
    return respond(`Automatic ${category} sync disabled.`);
  }
  return respond("This command is registered but its handler is not implemented yet.");
}
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/") return json({ ok: true, service: "notesmp-discord-worker" });

    const setupPath = url.pathname === "/setup" || url.pathname === "/setup/register-commands";
    if (request.method === "OPTIONS" && setupPath) {
      return new Response(null, { status: 204, headers: {
        "Access-Control-Allow-Origin": "https://hoppscotch.io",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Authorization, Content-Type",
        "Access-Control-Max-Age": "86400",
        "Vary": "Origin"
      }});
    }

    if (request.method === "POST" && setupPath) {
      const setupSecret = env.COMMAND_SETUP_SECRET;
      const authorization = request.headers.get("Authorization") || "";
      if (!setupSecret || (authorization !== setupSecret && authorization !== `Bearer ${setupSecret}`)) return json({ error: "Unauthorized" }, 401);
      if (!env.DISCORD_BOT_TOKEN || !env.DISCORD_APPLICATION_ID || !env.ALLOWED_GUILD_ID) {
        return json({ error: "Missing required Worker bindings: DISCORD_BOT_TOKEN, DISCORD_APPLICATION_ID, ALLOWED_GUILD_ID" }, 500);
      }
      const discordResponse = await fetch(`https://discord.com/api/v10/applications/${env.DISCORD_APPLICATION_ID}/guilds/${env.ALLOWED_GUILD_ID}/commands`, {
        method: "PUT",
        headers: { "Authorization": `Bot ${env.DISCORD_BOT_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify(REGISTERED_COMMANDS)
      });
      if (!discordResponse.ok) {
        console.error("Command registration rejected by Discord:", discordResponse.status);
        return json({ error: "Discord rejected command registration", status: discordResponse.status }, 502);
      }
      const registered = await discordResponse.json();
      return new Response(JSON.stringify({ ok: true, registered: registered.length, commands: registered.map(command => command.name) }), {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store",
          "Access-Control-Allow-Origin": "https://hoppscotch.io",
          "Vary": "Origin"
        }
      });
    }

    if (request.method !== "POST" || url.pathname !== "/interactions") return json({ error: "Not found" }, 404);
    const body = await request.text();
    if (!(await verifyDiscordRequest(request, body, env.DISCORD_PUBLIC_KEY))) return json({ error: "Invalid request signature" }, 401);
    let interaction;
    try { interaction = JSON.parse(body); } catch { return json({ error: "Invalid JSON" }, 400); }
    if (interaction.type === 1) return json({ type: 1 });
    if (!env.ALLOWED_GUILD_ID || interaction.guild_id !== env.ALLOWED_GUILD_ID) return respond("This bot is only available in the official NoteSMP Discord server.");
    if (interaction.type === 2) {
      try { return await handle(interaction, env); }
      catch (error) {
        console.error("Interaction handler failed:", String(error?.message || error));
        return respond("The command failed. Please check the Worker logs or try again.");
      }
    }
    return json({ error: "Unsupported interaction type" }, 400);
  },
};
