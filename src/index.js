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
  ] },
  { name: "publish", description: "Publish a Discord message to the NoteSMP website", options: [
    { type: 3, name: "message_id", description: "ID of the Discord message to publish", required: true },
    { type: 3, name: "gallery_category", description: "Gallery section", required: true, choices: ["events","buildings","places","inprogress"].map(value => ({ name: value, value })) },
    { type: 3, name: "title", description: "Website post title", required: false },
    { type: 3, name: "subtitle", description: "Website post subtitle", required: false },
    { type: 3, name: "dimension", description: "Minecraft dimension", required: false },
    { type: 3, name: "coordinates", description: "Coordinates, e.g. 120, 64, -30", required: false }
  ] },
  { name: "post", description: "Manage published website posts", options: [
    { type: 1, name: "remove", description: "Remove a published post", options: [{ type: 3, name: "post_id", description: "Six-digit post ID", required: true }] },
    { type: 1, name: "update", description: "Refresh a post from its original Discord message", options: [{ type: 3, name: "post_id", description: "Six-digit post ID", required: true }] }
  ] },
  { name: "creator", description: "Manage NoteSMP creators", options: [
    { type: 1, name: "add", description: "Add a Twitch creator", options: [{ type: 3, name: "twitchname", description: "Twitch username", required: true }] },
    { type: 1, name: "remove", description: "Remove a Twitch creator", options: [{ type: 3, name: "twitchname", description: "Twitch username", required: true }] }
  ] },
  { name: "verify", description: "Generate a Minecraft account-linking code", options: [{ type: 3, name: "playername", description: "Your exact Minecraft username", required: true }] },
  { name: "unverify", description: "Unlink a Discord and Minecraft account", options: [
    { type: 6, name: "discord_user", description: "Discord account", required: true },
    { type: 3, name: "minecraft_uuid", description: "Minecraft UUID", required: true }
  ] },
  { name: "playerstats", description: "View public Minecraft player statistics", options: [
    { type: 3, name: "playername", description: "Minecraft username", required: false },
    { type: 6, name: "discord_user", description: "Linked Discord account", required: false },
    { type: 3, name: "stat", description: "Minecraft statistic ID, e.g. minecraft:mob_kills", required: false }
  ] },
  { name: "serverstatus", description: "Manage the live Discord server status message", options: [
    { type: 1, name: "sendmessage", description: "Create or replace the status message", options: [{ type: 7, name: "channel", description: "Channel for the status embed", required: true }] }
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
const DEFAULT_ADMIN_IDS = new Set(["606514245001150484"]);
async function isOwner(env, userId) {
  return Boolean(userId && ((env.OWNER_DISCORD_ID && userId === env.OWNER_DISCORD_ID) || DEFAULT_ADMIN_IDS.has(userId)));
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

async function discordApi(env, path, init = {}) {
  const response = await fetch("https://discord.com/api/v10" + path, {
    ...init,
    headers: { "Authorization": `Bot ${env.DISCORD_BOT_TOKEN}`, "Content-Type": "application/json", ...(init.headers || {}) }
  });
  const raw = await response.text();
  let data = null; try { data = raw ? JSON.parse(raw) : null; } catch {}
  if (!response.ok) throw new Error(`Discord API ${response.status}: ${data?.message || "request failed"}`);
  return data;
}
function cleanText(value, max = 4000) { return typeof value === "string" ? value.slice(0, max) : ""; }
async function nextSixDigitId(env) {
  for (let attempt = 0; attempt < 30; attempt++) {
    const bytes = crypto.getRandomValues(new Uint32Array(1));
    const id = String(100000 + (bytes[0] % 900000));
    const exists = await env.DB.prepare("SELECT 1 FROM published_posts WHERE six_digit_id=?").bind(id).first();
    if (!exists) return id;
  }
  throw new Error("Could not allocate a unique post ID");
}
function messageImages(message) {
  const urls = [];
  for (const attachment of message.attachments || []) if (attachment.content_type?.startsWith("image/") && attachment.url) urls.push(attachment.url);
  for (const embed of message.embeds || []) {
    if (embed.image?.url) urls.push(embed.image.url);
    else if (embed.thumbnail?.url) urls.push(embed.thumbnail.url);
  }
  return [...new Set(urls)].slice(0, 10);
}
async function fetchSourceMessage(env, channelId, messageId) {
  return await discordApi(env, `/channels/${channelId}/messages/${messageId}`);
}
async function getServerSnapshot(env) {
  if (!env.NOTESMP_API_URL) throw new Error("NOTESMP_API_URL is not configured on the bot Worker");
  const response = await fetch(env.NOTESMP_API_URL.replace(/\/$/, "") + "/v1/server");
  if (!response.ok) throw new Error("NoteSMP API server status is unavailable");
  return await response.json();
}
function serverEmbed(status) {
  const players = Array.isArray(status.onlinePlayers) ? status.onlinePlayers.map(p => typeof p === "string" ? p : p.name).filter(Boolean) : [];
  return {
    title: "NoteSMP Server Status",
    color: status.online ? 0x2ecc71 : 0xe74c3c,
    fields: [
      { name: "Status", value: status.online ? "🟢 Online" : "🔴 Offline", inline: true },
      { name: "Players", value: `${status.playersOnline || 0}/${status.maxPlayers || 0}`, inline: true },
      { name: "Version", value: status.version || "Unknown", inline: true },
      { name: "Server address", value: "`notesmp.de`", inline: true },
      { name: "MOTD", value: cleanText(status.motd, 900) || "—", inline: false },
      { name: "Online players", value: players.length ? players.slice(0, 30).join(", ") : "None", inline: false }
    ],
    footer: { text: status.updatedAt ? `Last update: ${status.updatedAt}` : "Waiting for server data" }
  };
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
      return respond(lines.length ? lines.join("\n") : "No additional access entries are configured.");
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

  if (command === "publish") {
    if (!(await hasAdminAccess(env, interaction))) return respond("You don’t have permission to publish website content.");
    const channelId = interaction.channel_id;
    const messageId = args.message_id;
    const group = args.gallery_category;
    const category = "gallery";
    if (!["events","buildings","places","inprogress"].includes(group)) return respond("Invalid gallery section.");
    const message = await fetchSourceMessage(env, channelId, messageId);
    const postId = crypto.randomUUID();
    const sixDigitId = await nextSixDigitId(env);
    const linked = await env.DB.prepare("SELECT minecraft_uuid,minecraft_name FROM account_links WHERE discord_user_id=?").bind(message.author?.id || "").first();
    const body = cleanText(message.content, 4000);
    const images = messageImages(message);
    const title = cleanText(args.title || "", 180) || null;
    const subtitle = cleanText(args.subtitle || "", 240) || null;
    const eventData = JSON.stringify({ galleryGroup: group, dimension: cleanText(args.dimension, 80), coordinates: cleanText(args.coordinates, 100) });
    await env.DB.prepare("INSERT INTO published_posts(post_id,six_digit_id,category,group_name,source_guild_id,source_channel_id,source_message_id,author_discord_id,linked_minecraft_uuid,linked_minecraft_name,title,subtitle,body,image_urls_json,event_data_json) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
      .bind(postId,sixDigitId,category,group,interaction.guild_id,channelId,messageId,message.author?.id || null,linked?.minecraft_uuid || null,linked?.minecraft_name || null,title,subtitle,body,JSON.stringify(images),eventData).run();
    return respond(null, true, { title: "Website post published", description: `${title || "Discord message"} was saved in **Gallery / ${group}**. Post ID: **${sixDigitId}**`, fields: [{ name: "Images", value: String(images.length), inline: true }, { name: "Minecraft author", value: linked?.minecraft_name || "Not linked", inline: true }] });
  }
  if (command === "post") {
    if (!(await hasAdminAccess(env, interaction))) return respond("You don’t have permission to manage website posts.");
    if (args.remove) {
      const id = args.remove.post_id;
      const row = await env.DB.prepare("SELECT post_id FROM published_posts WHERE six_digit_id=?").bind(id).first();
      if (!row) return respond("No published post has that six-digit ID.");
      await env.DB.prepare("DELETE FROM published_posts WHERE post_id=?").bind(row.post_id).run();
      return respond(`Removed website post **${id}**.`);
    }
    const id = args.update?.post_id;
    const row = await env.DB.prepare("SELECT * FROM published_posts WHERE six_digit_id=?").bind(id).first();
    if (!row) return respond("No published post has that six-digit ID.");
    const message = await fetchSourceMessage(env, row.source_channel_id, row.source_message_id);
    const images = messageImages(message);
    const linked = await env.DB.prepare("SELECT minecraft_uuid,minecraft_name FROM account_links WHERE discord_user_id=?").bind(message.author?.id || "").first();
    await env.DB.prepare("UPDATE published_posts SET body=?,image_urls_json=?,author_discord_id=?,linked_minecraft_uuid=?,linked_minecraft_name=?,updated_at=CURRENT_TIMESTAMP WHERE post_id=?")
      .bind(cleanText(message.content,4000),JSON.stringify(images),message.author?.id || null,linked?.minecraft_uuid || null,linked?.minecraft_name || null,row.post_id).run();
    return respond(`Updated website post **${id}** from its original Discord message.`);
  }
  if (command === "creator") {
    if (!(await hasAdminAccess(env, interaction))) return respond("You don’t have permission to manage creators.");
    const login = cleanText((args.add?.twitchname || args.remove?.twitchname || "").trim().toLowerCase(), 25);
    if (!/^[a-z0-9_]{1,25}$/.test(login)) return respond("Enter a valid Twitch username.");
    if (args.add) {
      await env.DB.prepare("INSERT OR IGNORE INTO creators(twitch_login,added_by) VALUES(?,?)").bind(login,userId).run();
      return respond(`Added Twitch creator **${login}**. Live-stream detection requires Twitch credentials on the Worker.`);
    }
    await env.DB.prepare("DELETE FROM creators WHERE twitch_login=?").bind(login).run();
    return respond(`Removed Twitch creator **${login}**.`);
  }
  if (command === "verify") {
    const playerName = cleanText(args.playername?.trim(), 16);
    if (!/^[A-Za-z0-9_]{3,16}$/.test(playerName)) return respond("Enter a valid Minecraft Java username (3–16 letters, numbers or underscores).");
    const existing = await env.DB.prepare("SELECT minecraft_name FROM account_links WHERE discord_user_id=?").bind(userId).first();
    if (existing) return respond(`Your Discord account is already linked to **${existing.minecraft_name}**. Ask an admin to unlink it first if this is wrong.`);
    const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 900000 + 100000);
    const now = Math.floor(Date.now()/1000);
    await env.DB.prepare("DELETE FROM verification_requests WHERE discord_user_id=? OR expires_at<=?").bind(userId,now).run();
    await env.DB.prepare("INSERT INTO verification_requests(code,discord_user_id,minecraft_name,expires_at,created_at) VALUES(?,?,?,?,?)").bind(code,userId,playerName,now+120,now).run();
    return respond(null,true,{ title:"Minecraft verification", description:`Run this command in Minecraft within **2 minutes**:
` + "`/verify " + code + "`", fields:[{name:"Minecraft username",value:playerName,inline:true},{name:"Expires",value:"In 2 minutes",inline:true}], footer:{text:"Do not share this code with anyone"} });
  }
  if (command === "unverify") {
    if (!(await hasAdminAccess(env, interaction))) return respond("You don’t have permission to unlink accounts.");
    const discordUser = args.discord_user;
    const discordId = typeof discordUser === "object" ? discordUser.id : discordUser;
    const uuidHex = cleanText(args.minecraft_uuid, 36).replace(/-/g,"").toLowerCase();
    const uuid = uuidHex.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/,"$1-$2-$3-$4-$5");
    const deleted = await env.DB.prepare("DELETE FROM account_links WHERE discord_user_id=? AND minecraft_uuid=?").bind(discordId,uuid).run();
    return respond(deleted.meta?.changes ? "The Discord and Minecraft accounts have been unlinked." : "No matching account link was found.");
  }
  if (command === "playerstats") {
    const discordUser = args.discord_user;
    const discordId = typeof discordUser === "object" ? discordUser.id : discordUser;
    let player = null;
    if (discordId) player = await env.DB.prepare("SELECT p.uuid,p.username,p.first_join,p.last_seen,p.playtime_seconds,p.blocks_broken,p.blocks_placed,p.deaths,p.kills FROM players p JOIN account_links a ON a.minecraft_uuid=p.uuid WHERE a.discord_user_id=?").bind(discordId).first();
    else if (args.playername) player = await env.DB.prepare("SELECT uuid,username,first_join,last_seen,playtime_seconds,blocks_broken,blocks_placed,deaths,kills FROM players WHERE username=? COLLATE NOCASE").bind(cleanText(args.playername,16)).first();
    else return respond("Provide a Minecraft username or a linked Discord user.");
    if (!player) return respond("Player not found, or that Discord account is not linked.");
    const stat = args.stat;
    if (stat) {
      const labels = { playtime_seconds:"Playtime (seconds)",blocks_broken:"Blocks broken",blocks_placed:"Blocks placed",deaths:"Deaths",kills:"Kills" };
      const detailed = await env.DB.prepare("SELECT stat_value FROM player_statistics WHERE minecraft_uuid=? AND stat_id=?").bind(player.uuid,stat).first();
      const value = detailed?.stat_value ?? player[stat] ?? 0;
      return respond(null,true,{title:`${player.username} — ${labels[stat] || stat}`,description:String(value)});
    }
    const detailed = await env.DB.prepare("SELECT stat_id,stat_value FROM player_statistics WHERE minecraft_uuid=? ORDER BY stat_id LIMIT 20").bind(player.uuid).all();
    const fields = [
      {name:"Playtime",value:`${Math.floor((player.playtime_seconds || 0)/3600)} hours`,inline:true},
      {name:"Blocks broken",value:String(player.blocks_broken || 0),inline:true},
      {name:"Blocks placed",value:String(player.blocks_placed || 0),inline:true},
      {name:"Deaths",value:String(player.deaths || 0),inline:true},
      {name:"Kills",value:String(player.kills || 0),inline:true}
    ];
    for (const item of (detailed.results || [])) fields.push({name:item.stat_id.slice(0,256),value:String(item.stat_value),inline:true});
    fields.push({name:"UUID",value:player.uuid,inline:false});
    return respond(null,true,{title:`${player.username} — Player statistics`,fields});
  }
  if (command === "serverstatus") {
    if (!(await hasAdminAccess(env, interaction))) return respond("You don’t have permission to configure server status.");
    const channelId = args.sendmessage?.channel;
    const status = await getServerSnapshot(env);
    const sent = await discordApi(env,`/channels/${channelId}/messages`,{method:"POST",body:JSON.stringify({embeds:[serverEmbed(status)]})});
    await env.DB.prepare("INSERT INTO status_message(id,channel_id,message_id) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET channel_id=excluded.channel_id,message_id=excluded.message_id,updated_at=CURRENT_TIMESTAMP").bind(channelId,sent.id).run();
    return respond(`Server status embed created in <#${channelId}>. The Worker will refresh it automatically when its cron trigger is enabled.`);
  }

  if (["link", "sync", "unsync"].includes(command)) {
    if (!(await hasAdminAccess(env, interaction))) return respond("You don’t have permission to manage website content.");
    if (command === "link") {
      if (args.set) {
        const key = args.set.key;
        const url = args.set.url;
        if (!["discord", "youtube", "modpack", "bluemap"].includes(key) || !/^https?:\/\//i.test(url || "")) return respond("Choose a supported link key and provide a valid http(s) URL.");
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

async function syncDiscordEvents(env) {
  if (!env.DISCORD_BOT_TOKEN || !env.ALLOWED_GUILD_ID) return;
  const events = await discordApi(env,`/guilds/${env.ALLOWED_GUILD_ID}/scheduled-events?with_user_count=true`);
  for (const event of events || []) {
    const postId = `discord-event-${event.id}`;
    const channelId = "discord-event";
    const images = event.cover_image ? [`https://cdn.discordapp.com/guild-events/${event.id}/${event.cover_image}.png?size=1024`] : [];
    const eventData = {
      scheduledStartTime:event.scheduled_start_time,scheduledEndTime:event.scheduled_end_time,
      entityType:event.entity_type,location:event.entity_metadata?.location || null,
      userCount:event.user_count || 0,status:event.status,creatorId:event.creator_id
    };
    const existing = await env.DB.prepare("SELECT post_id FROM published_posts WHERE source_guild_id=? AND source_channel_id=? AND source_message_id=? AND category='events'").bind(env.ALLOWED_GUILD_ID,channelId,event.id).first();
    if (existing) {
      await env.DB.prepare("UPDATE published_posts SET title=?,body=?,image_urls_json=?,event_data_json=?,updated_at=CURRENT_TIMESTAMP WHERE post_id=?")
        .bind(cleanText(event.name,180),cleanText(event.description,4000),JSON.stringify(images),JSON.stringify(eventData),existing.post_id).run();
    } else {
      const six = await nextSixDigitId(env);
      await env.DB.prepare("INSERT INTO published_posts(post_id,six_digit_id,category,source_guild_id,source_channel_id,source_message_id,title,body,image_urls_json,event_data_json) VALUES(?,?,?,?,?,?,?,?,?,?)")
        .bind(postId,six,"events",env.ALLOWED_GUILD_ID,channelId,event.id,cleanText(event.name,180),cleanText(event.description,4000),JSON.stringify(images),JSON.stringify(eventData)).run();
    }
  }
}

async function syncConfiguredChannels(env) {
  const configured = await env.DB.prepare("SELECT category,channel_id FROM channel_sync").all();
  for (const item of configured.results || []) {
    const state = await env.DB.prepare("SELECT last_message_id FROM channel_sync_state WHERE category=?").bind(item.category).first();
    const query = new URLSearchParams({limit:"50"});
    if (state?.last_message_id) query.set("after",state.last_message_id);
    const messages = await discordApi(env,`/channels/${item.channel_id}/messages?${query.toString()}`);
    const ordered = (messages || []).slice().reverse();
    for (const message of ordered) {
      if (message.type !== 0 || !message.id) continue;
      const images = messageImages(message);
      const six = await nextSixDigitId(env);
      await env.DB.prepare("INSERT OR IGNORE INTO published_posts(post_id,six_digit_id,category,source_guild_id,source_channel_id,source_message_id,author_discord_id,title,body,image_urls_json) VALUES(?,?,?,?,?,?,?,?,?,?)")
        .bind(`sync-${item.category}-${message.id}`,six,item.category,env.ALLOWED_GUILD_ID,item.channel_id,message.id,message.author?.id || null,null,cleanText(message.content,4000),JSON.stringify(images)).run();
    }
    if (messages?.length) {
      const newest = messages[0].id;
      await env.DB.prepare("INSERT INTO channel_sync_state(category,last_message_id) VALUES(?,?) ON CONFLICT(category) DO UPDATE SET last_message_id=excluded.last_message_id,updated_at=CURRENT_TIMESTAMP").bind(item.category,newest).run();
    }
  }
}

async function refreshStatusMessage(env) {
  const saved = await env.DB.prepare("SELECT channel_id,message_id FROM status_message WHERE id=1").first();
  if (!saved?.message_id || !saved?.channel_id) return;
  const status = await getServerSnapshot(env);
  await discordApi(env,`/channels/${saved.channel_id}/messages/${saved.message_id}`,{
    method:"PATCH",body:JSON.stringify({embeds:[serverEmbed(status)]})
  });
}
async function refreshTwitchCreators(env) {
  if (!env.TWITCH_CLIENT_ID || !env.TWITCH_CLIENT_SECRET) return;
  const tokenResponse = await fetch("https://id.twitch.tv/oauth2/token",{
    method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},
    body:new URLSearchParams({client_id:env.TWITCH_CLIENT_ID,client_secret:env.TWITCH_CLIENT_SECRET,grant_type:"client_credentials"})
  });
  if (!tokenResponse.ok) throw new Error("Twitch app-token request failed");
  const token = await tokenResponse.json();
  const creators = await env.DB.prepare("SELECT twitch_login FROM creators").all();
  const logins = (creators.results || []).map(row=>row.twitch_login);
  if (!logins.length) return;
  for (let i=0;i<logins.length;i+=100) {
    const batch=logins.slice(i,i+100);
    const query=batch.map(login=>"user_login="+encodeURIComponent(login)).join("&");
    const response=await fetch("https://api.twitch.tv/helix/streams?"+query,{
      headers:{"Client-Id":env.TWITCH_CLIENT_ID,"Authorization":`Bearer ${token.access_token}`}
    });
    if (!response.ok) throw new Error("Twitch stream lookup failed");
    const data=await response.json();
    const live=new Map((data.data || []).filter(stream=>/notesmp/i.test(stream.title || "")).map(stream=>[stream.user_login.toLowerCase(),stream]));
    for (const login of batch) {
      const stream=live.get(login);
      await env.DB.prepare("UPDATE creators SET last_checked_at=CURRENT_TIMESTAMP,live_started_at=?,live_title=?,live_url=?,live_thumbnail_url=? WHERE twitch_login=?")
        .bind(stream?.started_at || null,stream?.title || null,stream ? `https://www.twitch.tv/${login}` : null,stream?.thumbnail_url?.replace("{width}","640").replace("{height}","360") || null,login).run();
    }
  }
}

export default {
  async scheduled(controller, env, ctx) {
    const minute = new Date(controller.scheduledTime || Date.now()).getUTCMinutes();
    const jobs = [syncDiscordEvents(env), syncConfiguredChannels(env)];
    if (minute % 5 === 0) jobs.push(refreshStatusMessage(env), refreshTwitchCreators(env));
    ctx.waitUntil(Promise.allSettled(jobs).then(results => {
      for (const result of results) if (result.status === "rejected") console.error("Scheduled job failed:", String(result.reason?.message || result.reason));
    }));
  },
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/") return json({ ok: true, service: "notesmp-discord-worker" });

    const setupPath = url.pathname === "/setup" || url.pathname === "/setup/register-commands" || url.pathname === "/setup/migrate";
    if (request.method === "OPTIONS" && setupPath) {
      return new Response(null, { status: 204, headers: {
        "Access-Control-Allow-Origin": "https://hoppscotch.io",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Authorization, Content-Type",
        "Access-Control-Max-Age": "86400",
        "Vary": "Origin"
      }});
    }


    if (request.method === "POST" && url.pathname === "/setup/migrate") {
      const secret = env.COMMAND_SETUP_SECRET;
      const authorization = request.headers.get("Authorization") || "";
      if (!secret || (authorization !== secret && authorization !== `Bearer ${secret}`)) return json({error:"Unauthorized"},401);
      await env.DB.exec(`
        CREATE TABLE IF NOT EXISTS verification_requests (
          code TEXT PRIMARY KEY, discord_user_id TEXT NOT NULL UNIQUE, minecraft_name TEXT NOT NULL,
          expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_verification_requests_expiry ON verification_requests(expires_at);
        CREATE TABLE IF NOT EXISTS player_statistics (
          minecraft_uuid TEXT NOT NULL, stat_id TEXT NOT NULL, stat_value REAL NOT NULL DEFAULT 0,
          updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(minecraft_uuid,stat_id)
        );
        CREATE INDEX IF NOT EXISTS idx_player_statistics_uuid ON player_statistics(minecraft_uuid);
        CREATE TABLE IF NOT EXISTS channel_sync_state (category TEXT PRIMARY KEY, last_message_id TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
      `);
      return json({ok:true,migrated:["verification_requests","player_statistics","channel_sync_state"]});
    }

    if (request.method === "POST" && setupPath && url.pathname !== "/setup/migrate") {
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


    if (request.method === "POST" && url.pathname === "/minecraft/verify") {
      if (!env.MINECRAFT_API_KEY || request.headers.get("Authorization") !== `Bearer ${env.MINECRAFT_API_KEY}`) return json({error:"Unauthorized"},401);
      let payload; try { payload = await request.json(); } catch { return json({error:"Invalid JSON"},400); }
      const code = String(payload.code || "");
      const uuidHex = String(payload.minecraftUuid || "").replace(/-/g,"").toLowerCase();
      const uuid = uuidHex.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/,"$1-$2-$3-$4-$5");
      const name = cleanText(payload.minecraftName,16);
      if (!/^\d{6}$/.test(code) || !/^[0-9a-f]{32}$/.test(uuidHex) || !/^[A-Za-z0-9_]{3,16}$/.test(name)) return json({error:"Invalid verification payload"},400);
      const now = Math.floor(Date.now()/1000);
      const pending = await env.DB.prepare("SELECT discord_user_id,minecraft_name FROM verification_requests WHERE code=? AND expires_at>?").bind(code,now).first();
      if (!pending) return json({error:"Verification code is invalid or expired"},404);
      if (pending.minecraft_name.toLowerCase() !== name.toLowerCase()) return json({error:"Minecraft username does not match the requested account"},400);
      try {
        await env.DB.prepare("INSERT INTO account_links(discord_user_id,minecraft_uuid,minecraft_name) VALUES(?,?,?)").bind(pending.discord_user_id,uuid,name).run();
      } catch {
        return json({error:"This Discord account or Minecraft UUID is already linked"},409);
      }
      await env.DB.prepare("DELETE FROM verification_requests WHERE code=?").bind(code).run();
      await env.DB.prepare("DELETE FROM verification_codes WHERE discord_user_id=?").bind(pending.discord_user_id).run();
      return json({ok:true,discordUserId:pending.discord_user_id,minecraftUuid:uuid,minecraftName:name});
    }
    if (request.method === "POST" && url.pathname === "/minecraft/playerstats") {
      if (!env.MINECRAFT_API_KEY || request.headers.get("Authorization") !== `Bearer ${env.MINECRAFT_API_KEY}`) return json({error:"Unauthorized"},401);
      let payload; try { payload = await request.json(); } catch { return json({error:"Invalid JSON"},400); }
      const uuidHex = String(payload.uuid || "").replace(/-/g,"").toLowerCase();
      const uuid = uuidHex.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/,"$1-$2-$3-$4-$5");
      const username = cleanText(payload.username,16);
      if (uuidHex.length !== 32 || !/^[0-9a-f]+$/.test(uuidHex) || !/^[A-Za-z0-9_]{3,16}$/.test(username)) return json({error:"Invalid player identity"},400);
      const base = payload.baseStats || {};
      const number = key => Number.isFinite(Number(base[key])) && Number(base[key]) >= 0 ? Number(base[key]) : 0;
      await env.DB.prepare(`INSERT INTO players(uuid,username,first_join,last_seen,playtime_seconds,blocks_broken,blocks_placed,deaths,kills,updated_at)
        VALUES(?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)
        ON CONFLICT(uuid) DO UPDATE SET username=excluded.username,last_seen=excluded.last_seen,
        playtime_seconds=excluded.playtime_seconds,blocks_broken=excluded.blocks_broken,blocks_placed=excluded.blocks_placed,
        deaths=excluded.deaths,kills=excluded.kills,updated_at=CURRENT_TIMESTAMP`)
        .bind(uuid,username,typeof payload.firstJoin==="string"?payload.firstJoin:null,typeof payload.lastSeen==="string"?payload.lastSeen:null,
          number("playtime_seconds"),number("blocks_broken"),number("blocks_placed"),number("deaths"),number("kills")).run();
      const stats = payload.statistics && typeof payload.statistics === "object" ? Object.entries(payload.statistics).slice(0,500) : [];
      for (const [statId,value] of stats) {
        if (!/^[a-z0-9_.:-]{1,100}$/i.test(statId) || !Number.isFinite(Number(value)) || Number(value)<0) continue;
        await env.DB.prepare("INSERT INTO player_statistics(minecraft_uuid,stat_id,stat_value) VALUES(?,?,?) ON CONFLICT(minecraft_uuid,stat_id) DO UPDATE SET stat_value=excluded.stat_value,updated_at=CURRENT_TIMESTAMP")
          .bind(uuid,statId,Number(value)).run();
      }
      return json({ok:true,statsStored:stats.length});
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
