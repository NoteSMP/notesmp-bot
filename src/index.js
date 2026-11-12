/**
 * NoteSMP event-driven Discord interactions Worker.
 * No persistent Gateway connection is used.
 */
const encoder = new TextEncoder();
const MINECRAFT_GOLD = 0xFFAA00;

const REGISTERED_COMMANDS = [
  {
    "name": "website",
    "description": "Show the NoteSMP website link"
  },
  {
    "name": "modpack",
    "description": "Show the NoteSMP modpack link"
  },
  {
    "name": "youtube",
    "description": "Show the NoteSMP YouTube link"
  },
  {
    "name": "bluemap",
    "description": "Show the NoteSMP BlueMap link"
  },
  {
    "name": "donate",
    "description": "Show the NoteSMP donate link"
  },
  {
    "name": "help",
    "description": "Show NoteSMP bot help"
  },
  {
    "name": "verify",
    "description": "Generate a Minecraft account-linking code",
    "options": [
      {
        "type": 3,
        "name": "playername",
        "description": "Your exact Minecraft username",
        "required": true
      }
    ]
  },
  {
    "name": "unverify",
    "description": "Unlink a Discord and Minecraft account",
    "options": [
      {
        "type": 6,
        "name": "discord_user",
        "description": "Discord account",
        "required": true
      },
      {
        "type": 3,
        "name": "minecraft_uuid",
        "description": "Minecraft UUID",
        "required": true
      }
    ]
  },
  {
    "name": "ign",
    "description": "Look up a linked Minecraft username",
    "options": [
      {
        "type": 6,
        "name": "discordname",
        "description": "Discord user to look up",
        "required": true
      }
    ]
  },
  {
    "name": "playerstats",
    "description": "View public Minecraft player statistics",
    "options": [
      {
        "type": 3,
        "name": "playername",
        "description": "Minecraft username",
        "required": false
      },
      {
        "type": 6,
        "name": "discord_user",
        "description": "Linked Discord account",
        "required": false
      },
      {
        "type": 3,
        "name": "stat",
        "description": "Minecraft statistic ID, e.g. minecraft:mob_kills",
        "required": false
      }
    ]
  },
  {
    "name": "serverstatus",
    "description": "Manage the live Discord server status message",
    "options": [
      {
        "type": 1,
        "name": "sendmessage",
        "description": "Create or replace the status message",
        "options": [
          {
            "type": 7,
            "name": "channel",
            "description": "Channel for the status embed",
            "required": true
          }
        ]
      }
    ]
  },
  {
    "name": "ws",
    "description": "Manage NoteSMP website",
    "options": [
      {
        "type": 2,
        "name": "player",
        "description": "Control public player visibility",
        "options": [
          {
            "type": 1,
            "name": "hide",
            "description": "Hide a player from the website",
            "options": [
              {
                "type": 3,
                "name": "player",
                "description": "Minecraft username or UUID",
                "required": true
              }
            ]
          },
          {
            "type": 1,
            "name": "show",
            "description": "Show a player on the website again",
            "options": [
              {
                "type": 3,
                "name": "player",
                "description": "Minecraft username or UUID",
                "required": true
              }
            ]
          }
        ]
      },
      {
        "type": 2,
        "name": "access",
        "description": "Manage administrator access",
        "options": [
          {
            "type": 1,
            "name": "add",
            "description": "Grant access",
            "options": [
              {
                "type": 9,
                "name": "target",
                "description": "User or role",
                "required": true
              }
            ]
          },
          {
            "type": 1,
            "name": "remove",
            "description": "Remove access",
            "options": [
              {
                "type": 9,
                "name": "target",
                "description": "User or role",
                "required": true
              }
            ]
          },
          {
            "type": 1,
            "name": "list",
            "description": "List access",
            "options": []
          }
        ]
      },
      {
        "type": 2,
        "name": "link",
        "description": "Manage website links",
        "options": [
          {
            "type": 1,
            "name": "set",
            "description": "Set link",
            "options": [
              {
                "type": 3,
                "name": "key",
                "description": "Link key",
                "required": true,
                "choices": [
                  {
                    "name": "discord",
                    "value": "discord"
                  },
                  {
                    "name": "youtube",
                    "value": "youtube"
                  },
                  {
                    "name": "modpack",
                    "value": "modpack"
                  },
                  {
                    "name": "bluemap",
                    "value": "bluemap"
                  },
                  {
                    "name": "donate",
                    "value": "donate"
                  }
                ]
              },
              {
                "type": 3,
                "name": "url",
                "description": "Full URL",
                "required": true
              }
            ]
          },
          {
            "type": 1,
            "name": "unset",
            "description": "Remove link",
            "options": [
              {
                "type": 3,
                "name": "key",
                "description": "Link key",
                "required": true,
                "choices": [
                  {
                    "name": "discord",
                    "value": "discord"
                  },
                  {
                    "name": "youtube",
                    "value": "youtube"
                  },
                  {
                    "name": "modpack",
                    "value": "modpack"
                  },
                  {
                    "name": "bluemap",
                    "value": "bluemap"
                  },
                  {
                    "name": "donate",
                    "value": "donate"
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        "type": 1,
        "name": "sync",
        "description": "Enable channel sync",
        "options": [
          {
            "type": 3,
            "name": "category",
            "description": "rules or updates",
            "required": true,
            "choices": [
              {
                "name": "rules",
                "value": "rules"
              },
              {
                "name": "updates",
                "value": "updates"
              }
            ]
          },
          {
            "type": 7,
            "name": "channel",
            "description": "Source channel",
            "required": true
          }
        ]
      },
      {
        "type": 1,
        "name": "unsync",
        "description": "Disable channel sync",
        "options": [
          {
            "type": 3,
            "name": "category",
            "description": "rules or updates",
            "required": true,
            "choices": [
              {
                "name": "rules",
                "value": "rules"
              },
              {
                "name": "updates",
                "value": "updates"
              }
            ]
          }
        ]
      },
      {
        "type": 2,
        "name": "gallery",
        "description": "Manage gallery",
        "options": [
          {
            "type": 1,
            "name": "add",
            "description": "Add gallery post",
            "options": [
              {
                "type": 3,
                "name": "gallery_category",
                "description": "Gallery section",
                "required": true,
                "choices": [
                  {
                    "name": "events",
                    "value": "events"
                  },
                  {
                    "name": "buildings",
                    "value": "buildings"
                  },
                  {
                    "name": "places",
                    "value": "places"
                  },
                  {
                    "name": "inprogress",
                    "value": "inprogress"
                  }
                ]
              },
              {
                "type": 3,
                "name": "message_id",
                "description": "Discord message ID",
                "required": true
              },
              {
                "type": 3,
                "name": "title",
                "description": "Title",
                "required": true
              },
              {
                "type": 3,
                "name": "subtitle",
                "description": "Subtitle",
                "required": false
              },
              {
                "type": 3,
                "name": "builders",
                "description": "Comma-separated builder names/linked mentions",
                "required": false
              },
              {
                "type": 3,
                "name": "dimension",
                "description": "Dimension",
                "required": false,
                "choices": [
                  {
                    "name": "overworld",
                    "value": "overworld"
                  },
                  {
                    "name": "nether",
                    "value": "nether"
                  },
                  {
                    "name": "end",
                    "value": "end"
                  }
                ]
              },
              {
                "type": 3,
                "name": "coordinates",
                "description": "X, Y, Z",
                "required": false
              }
            ]
          },
          {
            "type": 1,
            "name": "delete",
            "description": "Delete gallery post",
            "options": [
              {
                "type": 3,
                "name": "post_id",
                "description": "Six-digit ID",
                "required": true
              }
            ]
          },
          {
            "type": 1,
            "name": "move",
            "description": "Move gallery post",
            "options": [
              {
                "type": 3,
                "name": "post_id",
                "description": "Six-digit ID",
                "required": true
              },
              {
                "type": 3,
                "name": "gallery_category",
                "description": "Destination",
                "required": true,
                "choices": [
                  {
                    "name": "events",
                    "value": "events"
                  },
                  {
                    "name": "buildings",
                    "value": "buildings"
                  },
                  {
                    "name": "places",
                    "value": "places"
                  },
                  {
                    "name": "inprogress",
                    "value": "inprogress"
                  }
                ]
              }
            ]
          },
          {
            "type": 1,
            "name": "modify",
            "description": "Modify gallery post",
            "options": [
              {
                "type": 3,
                "name": "post_id",
                "description": "Six-digit ID",
                "required": true
              },
              {
                "type": 3,
                "name": "title",
                "description": "Nonempty title",
                "required": false
              },
              {
                "type": 3,
                "name": "subtitle",
                "description": "Subtitle",
                "required": false
              },
              {
                "type": 3,
                "name": "builders",
                "description": "Comma-separated builders",
                "required": false
              },
              {
                "type": 3,
                "name": "dimension",
                "description": "Dimension",
                "required": false,
                "choices": [
                  {
                    "name": "overworld",
                    "value": "overworld"
                  },
                  {
                    "name": "nether",
                    "value": "nether"
                  },
                  {
                    "name": "end",
                    "value": "end"
                  }
                ]
              },
              {
                "type": 3,
                "name": "coordinates",
                "description": "X, Y, Z",
                "required": false
              }
            ]
          }
        ]
      },
      {
        "type": 2,
        "name": "events",
        "description": "Manage events",
        "options": [
          {
            "type": 1,
            "name": "delete",
            "description": "Delete post",
            "options": [
              {
                "type": 3,
                "name": "post_id",
                "description": "Six-digit ID",
                "required": true
              }
            ]
          }
        ]
      },
      {
        "type": 2,
        "name": "updates",
        "description": "Manage updates",
        "options": [
          {
            "type": 1,
            "name": "update",
            "description": "Refetch source message",
            "options": [
              {
                "type": 3,
                "name": "post_id",
                "description": "Six-digit ID",
                "required": true
              }
            ]
          },
          {
            "type": 1,
            "name": "delete",
            "description": "Delete post",
            "options": [
              {
                "type": 3,
                "name": "post_id",
                "description": "Six-digit ID",
                "required": true
              }
            ]
          }
        ]
      },
      {
        "type": 2,
        "name": "rules",
        "description": "Manage rules",
        "options": [
          {
            "type": 1,
            "name": "update",
            "description": "Refetch source message",
            "options": [
              {
                "type": 3,
                "name": "post_id",
                "description": "Six-digit ID",
                "required": true
              }
            ]
          },
          {
            "type": 1,
            "name": "delete",
            "description": "Delete post",
            "options": [
              {
                "type": 3,
                "name": "post_id",
                "description": "Six-digit ID",
                "required": true
              }
            ]
          }
        ]
      },
      {
        "type": 2,
        "name": "maintenance",
        "description": "Manage maintenance",
        "options": [
          {
            "type": 1,
            "name": "set",
            "description": "Set maintenance banner",
            "options": [
              {
                "type": 3,
                "name": "reason",
                "description": "Reason",
                "required": true
              },
              {
                "type": 3,
                "name": "format",
                "description": "relative or timestamp",
                "required": true,
                "choices": [
                  {
                    "name": "relative",
                    "value": "relative"
                  },
                  {
                    "name": "timestamp",
                    "value": "timestamp"
                  }
                ]
              },
              {
                "type": 3,
                "name": "duration",
                "description": "1w2d5h34m55s or Unix seconds",
                "required": true
              }
            ]
          },
          {
            "type": 1,
            "name": "remove",
            "description": "Remove maintenance",
            "options": []
          }
        ]
      },
      {
        "type": 2,
        "name": "warning",
        "description": "Manage warning notices",
        "options": [
          {
            "type": 1,
            "name": "add",
            "description": "Add warning",
            "options": [
              {
                "type": 3,
                "name": "title",
                "description": "Title",
                "required": true
              },
              {
                "type": 3,
                "name": "color",
                "description": "orange or red",
                "required": true,
                "choices": [
                  {
                    "name": "orange",
                    "value": "orange"
                  },
                  {
                    "name": "red",
                    "value": "red"
                  }
                ]
              },
              {
                "type": 3,
                "name": "subtitle",
                "description": "Subtitle",
                "required": false
              }
            ]
          },
          {
            "type": 1,
            "name": "modify",
            "description": "Modify warning",
            "options": [
              {
                "type": 3,
                "name": "post_id",
                "description": "Six-digit ID",
                "required": true
              },
              {
                "type": 3,
                "name": "title",
                "description": "Title",
                "required": false
              },
              {
                "type": 3,
                "name": "subtitle",
                "description": "Subtitle",
                "required": false
              },
              {
                "type": 3,
                "name": "color",
                "description": "orange or red",
                "required": false,
                "choices": [
                  {
                    "name": "orange",
                    "value": "orange"
                  },
                  {
                    "name": "red",
                    "value": "red"
                  }
                ]
              }
            ]
          },
          {
            "type": 1,
            "name": "remove",
            "description": "Remove warning",
            "options": [
              {
                "type": 3,
                "name": "post_id",
                "description": "Six-digit ID",
                "required": true
              }
            ]
          }
        ]
      },
      {
        "type": 2,
        "name": "info",
        "description": "Manage info notices",
        "options": [
          {
            "type": 1,
            "name": "add",
            "description": "Add info notice",
            "options": [
              {
                "type": 3,
                "name": "title",
                "description": "Title",
                "required": true
              },
              {
                "type": 3,
                "name": "subtitle",
                "description": "Subtitle",
                "required": false
              }
            ]
          },
          {
            "type": 1,
            "name": "modify",
            "description": "Modify info notice",
            "options": [
              {
                "type": 3,
                "name": "post_id",
                "description": "Six-digit ID",
                "required": true
              },
              {
                "type": 3,
                "name": "title",
                "description": "Title",
                "required": false
              },
              {
                "type": 3,
                "name": "subtitle",
                "description": "Subtitle",
                "required": false
              }
            ]
          },
          {
            "type": 1,
            "name": "remove",
            "description": "Remove info notice",
            "options": [
              {
                "type": 3,
                "name": "post_id",
                "description": "Six-digit ID",
                "required": true
              }
            ]
          }
        ]
      },
      {
        "type": 2,
        "name": "hero",
        "description": "Manage Info hero",
        "options": [
          {
            "type": 1,
            "name": "modify",
            "description": "Modify hero text",
            "options": [
              {
                "type": 3,
                "name": "title",
                "description": "Title",
                "required": true
              },
              {
                "type": 3,
                "name": "subtitle",
                "description": "Subtitle",
                "required": true
              }
            ]
          }
        ]
      },
      {
        "type": 2,
        "name": "creator",
        "description": "Manage creators",
        "options": [
          {
            "type": 1,
            "name": "add",
            "description": "Add Twitch creator",
            "options": [
              {
                "type": 3,
                "name": "twitchname",
                "description": "Twitch username",
                "required": true
              }
            ]
          },
          {
            "type": 1,
            "name": "remove",
            "description": "Remove Twitch creator",
            "options": [
              {
                "type": 3,
                "name": "twitchname",
                "description": "Twitch username",
                "required": true
              }
            ]
          }
        ]
      }
    ]
  }
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
function setupJson(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "Access-Control-Allow-Origin": "*",
    "Vary": "Origin"
  } });
}
function respond(content, ephemeral = true, embed = null) {
  const formattedEmbed = embed ? { ...embed, color: MINECRAFT_GOLD } : null;
  return json({ type: 4, data: { ...(formattedEmbed ? { embeds: [formattedEmbed] } : { content }), ...(ephemeral ? { flags: 64 } : {}), allowed_mentions: { parse: [] } } });
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
async function storeMessageImages(env, message, postId) {
  const sourceUrls = messageImages(message);
  if (!sourceUrls.length) return [];
  if (!env.GITHUB_TOKEN) throw new Error("GITHUB_TOKEN is not configured on the bot Worker");
  const saved = [];
  for (let index = 0; index < sourceUrls.length; index++) {
    const sourceUrl = sourceUrls[index];
    const response = await fetch(sourceUrl);
    if (!response.ok) throw new Error("Could not download an image attached to the Discord message");
    const contentType = (response.headers.get("content-type") || "").split(";")[0].toLowerCase();
    const extensionByType = { "image/jpeg": "jpg", "image/png": "png", "image/gif": "gif", "image/webp": "webp", "image/avif": "avif", "image/bmp": "bmp" };
    const extension = extensionByType[contentType] || (new URL(sourceUrl).pathname.match(/\.([a-z0-9]{2,5})$/i)?.[1]?.toLowerCase() || "img");
    const path = `gallery/${postId}/image-${index + 1}-${crypto.randomUUID()}.${extension}`;
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > 8 * 1024 * 1024) throw new Error("Gallery images must be 8 MB or smaller");
    let binary = "";
    for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + 0x8000, bytes.length)));
    const upload = await fetch(`https://api.github.com/repos/NoteSMP/notesmp-ressources/contents/${path.split("/").map(encodeURIComponent).join("/")}`, {
      method: "PUT",
      headers: { "Authorization": `Bearer ${env.GITHUB_TOKEN}`, "Accept": "application/vnd.github+json", "Content-Type": "application/json", "User-Agent": "NoteSMP-Discord-Bot/1.0 (+https://www.notesmp.de)", "X-GitHub-Api-Version": "2022-11-28" },
      body: JSON.stringify({ message: `Store NoteSMP gallery image for post ${postId}`, content: btoa(binary) })
    });
    if (!upload.ok) {
      const details = (await upload.text()).slice(0, 1200);
      const requestId = upload.headers.get("x-github-request-id") || "unavailable";
      const rateLimit = upload.headers.get("x-ratelimit-remaining");
      const rateLimitReset = upload.headers.get("x-ratelimit-reset");
      console.error("GitHub gallery upload rejected:", JSON.stringify({
        status: upload.status,
        requestId,
        rateLimitRemaining: rateLimit,
        rateLimitReset,
        details
      }));
      throw new Error(`GitHub image storage failed (HTTP ${upload.status}; request ${requestId}): ${details}`);
    }
    saved.push(`https://raw.githubusercontent.com/NoteSMP/notesmp-ressources/main/${path}`);
  }
  return saved;
}
async function deletePostImages(env, row) {
  let urls = [];
  try { urls = JSON.parse(row?.image_urls_json || "[]"); } catch {}
  if (!Array.isArray(urls) || !urls.length || !env.GITHUB_TOKEN) return;
  const all = await env.DB.prepare("SELECT image_urls_json FROM published_posts").all();
  const referenced = new Set();
  for (const item of all.results || []) {
    try { for (const url of JSON.parse(item.image_urls_json || "[]")) referenced.add(url); } catch {}
  }
  for (const url of urls) {
    if (referenced.has(url) || typeof url !== "string") continue;
    const prefix = "https://raw.githubusercontent.com/NoteSMP/notesmp-ressources/main/";
    if (!url.startsWith(prefix)) continue;
    const path = url.slice(prefix.length);
    const apiUrl = `https://api.github.com/repos/NoteSMP/notesmp-ressources/contents/${path.split("/").map(encodeURIComponent).join("/")}`;
    const headers = { "Authorization": `Bearer ${env.GITHUB_TOKEN}`, "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
    const file = await fetch(apiUrl, { headers });
    if (!file.ok) continue;
    const metadata = await file.json();
    await fetch(apiUrl, { method: "DELETE", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ message: "Remove NoteSMP gallery image after post deletion", sha: metadata.sha }) });
  }
}
function messageImages(message) {
  const urls = [];
  const imageExtensions = /\\.(?:png|jpe?g|gif|webp|avif|bmp)(?:$|[?#])/i;
  for (const attachment of Array.isArray(message?.attachments) ? message.attachments : []) {
    const contentType = String(attachment?.content_type || "").toLowerCase();
    const filename = String(attachment?.filename || "");
    const url = typeof attachment?.url === "string" ? attachment.url : "";
    if (url && (contentType.startsWith("image/") || imageExtensions.test(filename) || imageExtensions.test(url))) urls.push(url);
  }
  for (const embed of Array.isArray(message?.embeds) ? message.embeds : []) {
    if (embed?.image?.url) urls.push(embed.image.url);
    if (embed?.thumbnail?.url) urls.push(embed.thumbnail.url);
  }
  return [...new Set(urls)].slice(0, 10);
}
function parseCoordinates(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const parts = value.trim().match(/-?\d+(?:\.\d+)?/g);
  if (!parts || parts.length !== 3) return null;
  const [x, y, z] = parts.map(Number);
  if (![x, y, z].every(Number.isFinite)) return null;
  return { x, y, z };
}
function displayCoordinates(value) {
  const coords = typeof value === "string" ? parseCoordinates(value) : value;
  return coords && Number.isFinite(coords.x) && Number.isFinite(coords.y) && Number.isFinite(coords.z)
    ? `X: ${coords.x}, Y: ${coords.y}, Z: ${coords.z}`
    : "Not set";
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
    color: MINECRAFT_GOLD,
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
  let command = interaction.data?.name;
  let args = optionsMap(interaction.data?.options);
  if (command === "ws") {
    const top = interaction.data?.options?.[0];
    const groupName = top?.type === 2 ? top.name : null;
    const action = groupName ? top?.options?.[0] : top;
    const nestedAction = !groupName && action?.options?.[0]?.type === 1 ? action.options[0] : null;
    command = groupName ? `${groupName}.${action?.name || ""}` : nestedAction ? `${top.name}.${nestedAction.name}` : (top?.name || "");
    args = optionsMap(nestedAction?.options || action?.options || top?.options || []);
  }
  const userId = interaction.member?.user?.id || interaction.user?.id;
  const publicLinks = { website: "https://www.notesmp.de", modpack: "modpack", youtube: "youtube", bluemap: "bluemap", donate: "donate" };
  if (Object.prototype.hasOwnProperty.call(publicLinks, command)) {
    const key = publicLinks[command];
    let link = key === "https://www.notesmp.de" ? key : (await env.DB.prepare("SELECT url FROM website_links WHERE link_key=?").bind(key).first())?.url;
    const label = { website: "Website", modpack: "Modpack", youtube: "YouTube", bluemap: "BlueMap", donate: "Donate" }[command];
    if (!link || !/^https?:\/\//i.test(link)) return respond(`The ${label} link has not been set on the website yet.`, false);
    return respond(`${label}: <${link}>`, false);
  }
  if (command === "help") {
    return respond(null, true, { title: "NoteSMP Bot", description: "Event-driven bot connected. Use the available commands to manage NoteSMP." });
  }
  if (command === "access" || command === "access.add" || command === "access.remove" || command === "access.list") {
    if (!(await isOwner(env, userId))) return respond("Only the configured bot owner can manage access.");
    const sub = command.startsWith("access.") ? command.split(".")[1] : args.add ? "add" : args.remove ? "remove" : "list";
    if (sub === "list") {
      const rows = await env.DB.prepare("SELECT entry_type, discord_id FROM access_entries ORDER BY entry_type, discord_id").all();
      const lines = (rows.results || []).map(r => r.entry_type === "user" ? `User: <@${r.discord_id}>` : `Role: <@&${r.discord_id}>`);
      return respond(lines.length ? lines.join("\n") : "No additional access entries are configured.");
    }
    const target = args.target ?? args[sub]?.target;
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

  if (command === "player.hide" || command === "player.show") {
    if (!(await hasAdminAccess(env, interaction))) return respond("You don’t have permission to manage player visibility.");
    const target = cleanText(args.player, 64).trim();
    if (!target) return respond("Provide a Minecraft username or UUID.");
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(target);
    if (isUuid) {
      const uuid = target.toLowerCase();
      const player = await env.DB.prepare("SELECT uuid,username FROM players WHERE uuid=?").bind(uuid).first();
      if (command === "player.hide") {
        await env.DB.prepare("INSERT INTO hidden_players(uuid,username,hidden_by) VALUES(?,?,?) ON CONFLICT(uuid) DO UPDATE SET username=COALESCE(excluded.username,hidden_players.username),hidden_by=excluded.hidden_by,hidden_at=CURRENT_TIMESTAMP").bind(uuid,player?.username || null,userId).run();
        return respond(player?.username
          ? "**" + player.username + "** is now hidden from the website, including future online appearances."
          : "UUID **" + uuid + "** is now excluded from the website. It will remain hidden when this player first joins the server.");
      }
      const result = await env.DB.prepare("DELETE FROM hidden_players WHERE uuid=?").bind(uuid).run();
      return respond(result.meta?.changes
        ? (player?.username ? "**" + player.username + "** is visible on the website again." : "UUID **" + uuid + "** is no longer excluded from the website.")
        : "That UUID was not hidden.");
    }
    const player = await env.DB.prepare("SELECT uuid,username FROM players WHERE username=? COLLATE NOCASE").bind(target).first();
    if (!player) return respond("Player not found. Use their UUID to hide them before their first join.");
    if (command === "player.hide") {
      await env.DB.prepare("INSERT INTO hidden_players(uuid,username,hidden_by) VALUES(?,?,?) ON CONFLICT(uuid) DO UPDATE SET username=excluded.username,hidden_by=excluded.hidden_by,hidden_at=CURRENT_TIMESTAMP").bind(player.uuid,player.username,userId).run();
      return respond("**" + player.username + "** is now hidden from the website player list, online list, statistics, advancements and direct profile URL.");
    }
    await env.DB.prepare("DELETE FROM hidden_players WHERE uuid=?").bind(player.uuid).run();
    return respond("**" + player.username + "** is visible on the website again.");
  }
  if (command.startsWith("gallery.") || ["events.delete","updates.update","updates.delete","rules.update","rules.delete","maintenance.set","maintenance.remove","warning.add","warning.modify","warning.remove","info.add","info.modify","info.remove","hero.modify"].includes(command)) {
    if (!(await hasAdminAccess(env, interaction))) return respond("You don’t have permission to manage website content.");
    const validId = id => /^\d{6}$/.test(String(id || ""));
    const postById = async id => validId(id) ? env.DB.prepare("SELECT * FROM published_posts WHERE six_digit_id=?").bind(String(id)).first() : null;
    const saveNotice = async (kind,title,subtitle,color,expiryAt=null) => {
      const pid=crypto.randomUUID(), six=await nextSixDigitId(env);
      const data={type:kind,color:color|| (kind==="info"?"turquoise":kind==="maintenance"?"red":"orange"),...(expiryAt?{expiryAt}:{})};
      await env.DB.prepare("INSERT INTO published_posts(post_id,six_digit_id,category,group_name,source_guild_id,source_channel_id,source_message_id,author_discord_id,title,subtitle,body,image_urls_json,event_data_json) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)")
        .bind(pid,six,"news",kind,interaction.guild_id||"guild",interaction.channel_id||"website",kind+"-"+pid,userId,title,subtitle||"",subtitle||"","[]",JSON.stringify(data)).run();
      return six;
    };
    if (command==="gallery.add") {
      const category=args.gallery_category,title=cleanText(args.title,180).trim(),messageId=cleanText(args.message_id,30);
      if(!["events","buildings","places","inprogress"].includes(category)||!title||!/^\d{17,20}$/.test(messageId)) return respond("Choose a gallery category, provide a nonempty title, and a valid Discord message ID.");
      const existing=await env.DB.prepare("SELECT six_digit_id,group_name FROM published_posts WHERE source_guild_id=? AND source_channel_id=? AND source_message_id=? AND category='gallery' LIMIT 1").bind(interaction.guild_id,interaction.channel_id,messageId).first();
      if(existing) return respond(`This Discord message is already published in **Gallery / ${existing.group_name}**. Existing post ID: **${existing.six_digit_id}**. Use **/ws gallery move** if you want to change its section.`);
      const message=await fetchSourceMessage(env,interaction.channel_id,messageId);
      const subtitle=cleanText(args.subtitle,240).trim(),dimension=args.dimension||null,coords=args.coordinates?parseCoordinates(args.coordinates):null;
      if(args.coordinates&&!coords) return respond("Coordinates must contain exactly three numbers, e.g. 120, 64, -30.");
      const builders=[];
      for(const raw of cleanText(args.builders,500).split(",").map(x=>x.trim()).filter(Boolean)){
        const mention=raw.match(/^<@!?(\d+)>$/);
        if(mention){const linked=await env.DB.prepare("SELECT minecraft_name FROM account_links WHERE discord_user_id=?").bind(mention[1]).first();if(!linked)return respond(`Discord user <@${mention[1]}> has no linked Minecraft account.`);builders.push(linked.minecraft_name);}
        else builders.push(raw.replace(/^@/,""));
      }
      const six=await nextSixDigitId(env),pid=crypto.randomUUID(),ev={galleryGroup:category,dimension,coordinates:coords,builders};
      const linked=await env.DB.prepare("SELECT minecraft_uuid,minecraft_name FROM account_links WHERE discord_user_id=?").bind(message.author?.id||"").first();
      const images=await storeMessageImages(env, message, pid);
      try {
        await env.DB.prepare("INSERT INTO published_posts(post_id,six_digit_id,category,group_name,source_guild_id,source_channel_id,source_message_id,author_discord_id,linked_minecraft_uuid,linked_minecraft_name,title,subtitle,body,image_urls_json,event_data_json) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
         .bind(pid,six,"gallery",category,interaction.guild_id,interaction.channel_id,messageId,message.author?.id||null,linked?.minecraft_uuid||null,builders.join(", ")||null,title,subtitle,cleanText(message.content,4000),JSON.stringify(images),JSON.stringify(ev)).run();
      } catch(error) {
        if (!String(error).includes("UNIQUE constraint failed: published_posts.source_guild_id")) throw error;
        await deletePostImages(env,{image_urls_json:JSON.stringify(images)});
        const duplicate=await env.DB.prepare("SELECT six_digit_id,group_name FROM published_posts WHERE source_guild_id=? AND source_channel_id=? AND source_message_id=? AND category='gallery' LIMIT 1").bind(interaction.guild_id,interaction.channel_id,messageId).first();
        if(duplicate) return respond(`This Discord message is already published in **Gallery / ${duplicate.group_name}**. Existing post ID: **${duplicate.six_digit_id}**. Use **/ws gallery move** if you want to change its section.`);
        throw error;
      }
      return respond(`Gallery post created. ID: **${six}**`);
    }
    if(command==="gallery.delete"||command==="events.delete"||command==="updates.delete"||command==="rules.delete"){
      const row=await postById(args.post_id);if(!row)return respond("No post exists with that six-digit ID.");
      const expected=command.split(".")[0];
      const validType = expected==="gallery" ? row.category==="gallery" : expected==="events" ? (row.category==="events" || (row.category==="gallery"&&row.group_name==="events")) : row.category===expected;
      if(!validType)return respond("That ID does not belong to the selected post type.");
      if(expected==="events"&&row.category==="events"&&row.source_channel_id==="discord-event") {
        await env.DB.prepare("INSERT INTO bot_config(key,value) VALUES(?, 'deleted') ON CONFLICT(key) DO UPDATE SET value='deleted',updated_at=CURRENT_TIMESTAMP").bind("deleted_discord_event_"+row.source_message_id).run();
      }
      await env.DB.prepare("DELETE FROM published_posts WHERE post_id=?").bind(row.post_id).run();
      await deletePostImages(env, row);
      return respond(`Deleted ${expected} post **${args.post_id}** from the website.`);
    }
    if(command==="gallery.move"){
      const row=await postById(args.post_id);if(!row||row.category!=="gallery")return respond("Gallery post not found.");
      if(!["events","buildings","places","inprogress"].includes(args.gallery_category))return respond("Invalid gallery category.");
      let ev={};try{ev=JSON.parse(row.event_data_json||"{}")}catch{};ev.galleryGroup=args.gallery_category;
      await env.DB.prepare("UPDATE published_posts SET group_name=?,event_data_json=?,updated_at=CURRENT_TIMESTAMP WHERE post_id=?").bind(args.gallery_category,JSON.stringify(ev),row.post_id).run();
      return respond(`Moved gallery post **${args.post_id}** to **${args.gallery_category}**.`);
    }
    if(command==="gallery.modify"){
      const row=await postById(args.post_id);if(!row||row.category!=="gallery")return respond("Gallery post not found.");
      const title=Object.prototype.hasOwnProperty.call(args,"title")?cleanText(args.title,180).trim():row.title;
      if(!title)return respond("Title cannot be empty. Supply a nonempty title.");
      let ev={};try{ev=JSON.parse(row.event_data_json||"{}")}catch{};
      const dimension=args.dimension||null,coordinates=args.coordinates?parseCoordinates(args.coordinates):null;
      if(args.coordinates&&!coordinates)return respond("Coordinates must contain exactly three numbers.");
      const builders=[];
      for(const raw of cleanText(args.builders,500).split(",").map(x=>x.trim()).filter(Boolean)){
        const mention=raw.match(/^<@!?(\d+)>$/);
        if(mention){const linked=await env.DB.prepare("SELECT minecraft_name FROM account_links WHERE discord_user_id=?").bind(mention[1]).first();if(!linked)return respond(`Discord user <@${mention[1]}> has no linked Minecraft account.`);builders.push(linked.minecraft_name);}
        else builders.push(raw.replace(/^@/,""));
      }
      ev={...ev,dimension,coordinates,builders};
      await env.DB.prepare("UPDATE published_posts SET title=?,subtitle=?,linked_minecraft_name=?,event_data_json=?,updated_at=CURRENT_TIMESTAMP WHERE post_id=?").bind(title,cleanText(args.subtitle,240).trim(),builders.join(", ")||null,JSON.stringify(ev),row.post_id).run();
      return respond(`Modified gallery post **${args.post_id}**. Omitted subtitle/builders/dimension/coordinates were cleared.`);
    }
    if(command==="updates.update"||command==="rules.update"){
      const row=await postById(args.post_id),kind=command.split(".")[0];if(!row||row.category!==kind)return respond(`No ${kind} post found for that ID.`);
      const message=await fetchSourceMessage(env,row.source_channel_id,row.source_message_id);
      await env.DB.prepare("UPDATE published_posts SET body=?,image_urls_json=?,author_discord_id=?,updated_at=CURRENT_TIMESTAMP WHERE post_id=?").bind(cleanText(message.content,4000),JSON.stringify(await storeMessageImages(env,message,row.post_id)),message.author?.id||null,row.post_id).run();
      await deletePostImages(env, row);
      return respond(`Refetched ${kind} post **${args.post_id}** from Discord.`);
    }
    if(command==="maintenance.remove"){
      await env.DB.prepare("DELETE FROM published_posts WHERE category='news' AND group_name='maintenance'").run();return respond("Maintenance banner removed.");
    }
    if(command==="maintenance.set"){
      const reason=cleanText(args.reason,240).trim(),format=args.format,raw=cleanText(args.duration,100).trim();let until=NaN;
      if(format==="timestamp"&&/^\d{10}$/.test(raw))until=Number(raw)*1000;
      if(format==="relative"){
        const re=/(\d+)(w|d|h|m|s)/gi;let match,total=0,pos=0;while((match=re.exec(raw))){if(match.index!==pos)break;const mult={w:604800,d:86400,h:3600,m:60,s:1}[match[2].toLowerCase()];total+=Number(match[1])*mult;pos=re.lastIndex;}if(pos===raw.length&&pos>0&&total>0)until=Date.now()+total*1000;
      }
      if(!reason||!Number.isFinite(until)||until<=Date.now())return respond("Provide a reason and a future duration (1w2d5h34m55s) or 10-digit Unix timestamp.");
      await env.DB.prepare("DELETE FROM published_posts WHERE category='news' AND group_name='maintenance'").run();
      const six=await saveNotice("maintenance","Maintenance",reason,"red",new Date(until).toISOString());return respond(`Maintenance banner enabled. Post ID **${six}**.`);
    }
    if(command==="warning.add"||command==="info.add"){
      const kind=command.split(".")[0],title=cleanText(args.title,180).trim();if(!title)return respond("Title cannot be empty.");
      const color=kind==="info"?"turquoise":args.color;if(kind==="warning"&&!["orange","red"].includes(color))return respond("Choose orange or red.");
      const six=await saveNotice(kind,title,cleanText(args.subtitle,240).trim(),color);return respond(`Added ${kind} notice **${six}**.`);
    }
    if(command==="warning.modify"||command==="info.modify"||command==="warning.remove"||command==="info.remove"){
      const kind=command.split(".")[0],row=await postById(args.post_id);if(!row||row.category!=="news"||row.group_name!==kind)return respond(`No ${kind} notice found for that ID.`);
      if(command.endsWith(".remove")){await env.DB.prepare("DELETE FROM published_posts WHERE post_id=?").bind(row.post_id).run();return respond(`Removed ${kind} notice **${args.post_id}**.`);}
      const title=Object.prototype.hasOwnProperty.call(args,"title")?cleanText(args.title,180).trim():"",subtitle=Object.prototype.hasOwnProperty.call(args,"subtitle")?cleanText(args.subtitle,240).trim():"";
      let ev={};try{ev=JSON.parse(row.event_data_json||"{}")}catch{};if(kind==="warning"&&args.color){if(!["orange","red"].includes(args.color))return respond("Choose orange or red.");ev.color=args.color;}
      await env.DB.prepare("UPDATE published_posts SET title=?,subtitle=?,body=?,event_data_json=?,updated_at=CURRENT_TIMESTAMP WHERE post_id=?").bind(title,subtitle,subtitle,JSON.stringify(ev),row.post_id).run();
      return respond(`Modified ${kind} notice **${args.post_id}**.`);
    }
    if(command==="hero.modify"){
      await env.DB.prepare("INSERT INTO bot_config(key,value) VALUES('info_hero_title',?),('info_hero_subtitle',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP").bind(cleanText(args.title,180),cleanText(args.subtitle,240)).run();
      return respond("Info tab hero text updated.");
    }
  }
  if (command === "creator" || command.startsWith("creator.")) {
    if (!(await hasAdminAccess(env, interaction))) return respond("You don’t have permission to manage creators.");
    const login = cleanText((args.twitchname || args.add?.twitchname || args.remove?.twitchname || "").trim().toLowerCase(), 25);
    if (!/^[a-z0-9_]{1,25}$/.test(login)) return respond("Enter a valid Twitch username.");
    if (command === "creator.add" || args.add) {
      await env.DB.prepare("INSERT OR IGNORE INTO creators(twitch_login,added_by) VALUES(?,?)").bind(login,userId).run();
      if (env.TWITCH_CLIENT_ID && env.TWITCH_CLIENT_SECRET) await refreshTwitchCreators(env);
      return respond(env.TWITCH_CLIENT_ID && env.TWITCH_CLIENT_SECRET ? `Added Twitch creator **${login}**. Twitch live-stream checks are enabled.` : `Added Twitch creator **${login}**. Twitch live checks are paused until TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET are configured in the Cloudflare Worker.`);
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
    return respond(null,true,{ title:"Minecraft verification", description:"Run this command in Minecraft within **2 minutes**:\n```\n/verify " + code + "\n```", fields:[{name:"Minecraft username",value:playerName,inline:true},{name:"Expires",value:"In 2 minutes",inline:true}], footer:{text:"Do not share this code with anyone"} });
  }
  if (command === "ign") {
    const discordId = typeof args.discordname === "object" ? args.discordname.id : args.discordname;
    if (!/^\d{17,20}$/.test(String(discordId || ""))) return respond("Select a valid Discord user.", false);
    const linked = await env.DB.prepare(
      "SELECT a.minecraft_name FROM account_links a LEFT JOIN hidden_players h ON h.uuid=a.minecraft_uuid WHERE a.discord_user_id=? AND h.uuid IS NULL"
    ).bind(discordId).first();
    if (!linked?.minecraft_name) return respond(`<@${discordId}> is not linked to a public Minecraft player.`, false);
    return respond(null, false, {
      title: "Linked Minecraft account",
      description: "<@" + discordId + "> is linked to this Minecraft player:\n```\n" + cleanText(linked.minecraft_name,16) + "\n```"
    });
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
    if (discordId) player = await env.DB.prepare("SELECT p.uuid,p.username,p.first_join,p.last_seen,p.playtime_seconds,p.blocks_broken,p.blocks_placed,p.deaths,p.kills FROM players p JOIN account_links a ON a.minecraft_uuid=p.uuid LEFT JOIN hidden_players h ON h.uuid=p.uuid WHERE a.discord_user_id=? AND h.uuid IS NULL").bind(discordId).first();
    else if (args.playername) player = await env.DB.prepare("SELECT p.uuid,p.username,p.first_join,p.last_seen,p.playtime_seconds,p.blocks_broken,p.blocks_placed,p.deaths,p.kills FROM players p LEFT JOIN hidden_players h ON h.uuid=p.uuid WHERE p.username=? COLLATE NOCASE AND h.uuid IS NULL").bind(cleanText(args.playername,16)).first();
    else return respond("Provide a Minecraft username or a linked Discord user.");
    if (!player) return respond("Player not found, or that Discord account is not linked.");
    // A command requests a refresh but still responds with cached data immediately.
    // The plugin claims the shared queue item and updates this same D1 database.
    await env.DB.prepare("INSERT INTO stats_refresh_queue(uuid,username,status,requested_at) VALUES(?,?,'pending',CURRENT_TIMESTAMP) ON CONFLICT(uuid) DO UPDATE SET username=excluded.username,status='pending',requested_at=CURRENT_TIMESTAMP WHERE stats_refresh_queue.requested_at < datetime('now','-60 seconds')").bind(player.uuid,player.username).run();
    const stat = args.stat;
    if (stat) {
      const labels = { playtime_seconds:"Playtime (seconds)",blocks_broken:"Blocks broken",blocks_placed:"Blocks placed",deaths:"Deaths",kills:"Kills" };
      const detailed = await env.DB.prepare("SELECT stat_value FROM player_statistics WHERE minecraft_uuid=? AND stat_id=?").bind(player.uuid,stat).first();
      const value = detailed?.stat_value ?? player[stat] ?? 0;
      return respond(null,true,{title:`${player.username} — ${labels[stat] || stat}`,description:String(value)});
    }
    const fields = [
      {name:"Playtime",value:`${Math.floor((player.playtime_seconds || 0)/3600)} hours`,inline:true},
      {name:"Blocks broken",value:String(player.blocks_broken || 0),inline:true},
      {name:"Blocks placed",value:String(player.blocks_placed || 0),inline:true},
      {name:"Deaths",value:String(player.deaths || 0),inline:true},
      {name:"Kills",value:String(player.kills || 0),inline:true}
    ];
    return respond(null,true,{title:`${player.username} — Player statistics`,fields});
  }
  if (command === "news") {
    if (!(await hasAdminAccess(env, interaction))) return respond("You don’t have permission to manage website news.");
    if (args.unset) {
      await env.DB.prepare("DELETE FROM published_posts WHERE category='news'").run();
      return respond("Website news banner removed.");
    }
    const set = args.set || {};
    const maintenance = set.maintenance && typeof set.maintenance === "object" ? set.maintenance : {};
    // Discord may expose the duration under timestamp, duration, or as a direct
    // maintenance value depending on the registered command schema.
    const rawDuration = [maintenance.timestamp, maintenance.duration, maintenance.timestamp_until_end,
      typeof set.maintenance === "string" ? set.maintenance : "", set.timestamp, set.duration]
      .find(value => typeof value === "string" && value.trim()) || "";
    const reason = cleanText(maintenance.reason || set.reason, 240).trim();
    const mode = rawDuration || reason || maintenance.reason || maintenance.timestamp_until_end
      ? "maintenance" : set.warning ? "warning" : set.info ? "info" : null;
    if (!mode) return respond("Choose maintenance timestamp/duration, warning, info, or unset.");
    const values = mode === "maintenance" ? (set[mode] || {}) : (set[mode] || {});
    const title = mode === "maintenance" ? "Maintenance" : cleanText(values.title, 180).trim();
    const subtitle = mode === "maintenance" ? reason : cleanText(values.subtitle, 240).trim();
    const eventData = { type: mode };
    if (!title || !subtitle) return respond("Provide a maintenance reason, or a title and subtitle for warning/info.");
    if (mode === "maintenance") {
      const raw = String(rawDuration).trim();
      let until = NaN;
      if (/^\\d{10}$/.test(raw)) {
        until = Number(raw) * 1000;
      } else {
        // Accept compact durations such as "2h", "30m", "1d4h30m", and
        // whitespace between units. Require every character to be consumed.
        const durationPattern = /^(\\d+\\s*d)?\\s*(\\d+\\s*h)?\\s*(\\d+\\s*m)?\\s*(\\d+\\s*s)?$/i;
        const match = raw.match(durationPattern);
        if (match && match.slice(1).some(Boolean)) {
          const number = part => Number((part || "").replace(/[a-z\\s]/gi, "")) || 0;
          const seconds = number(match[1]) * 86400 + number(match[2]) * 3600 + number(match[3]) * 60 + number(match[4]);
          if (seconds > 0) until = Date.now() + seconds * 1000;
        }
      }
      if (!Number.isFinite(until) || until <= Date.now()) return respond("Use a future 10-digit Unix timestamp (seconds) or duration such as 2h, 30m, or 1d4h30m.");
      eventData.expiryAt = new Date(until).toISOString();
    }
    await env.DB.prepare("DELETE FROM published_posts WHERE category='news'").run();
    const postId = crypto.randomUUID();
    const sixDigitId = await nextSixDigitId(env);
    await env.DB.prepare("INSERT INTO published_posts(post_id,six_digit_id,category,group_name,source_guild_id,source_channel_id,source_message_id,author_discord_id,title,subtitle,body,image_urls_json,event_data_json) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)")
      .bind(postId,sixDigitId,"news",mode,interaction.guild_id,interaction.channel_id || "discord-news","news-" + postId,userId,title,subtitle,subtitle,"[]",JSON.stringify(eventData)).run();
    return respond("Website news banner set: **" + title + "**.");
  }
  if (command === "serverstatus") {
    if (!(await hasAdminAccess(env, interaction))) return respond("You don’t have permission to configure server status.");
    const channelId = args.sendmessage?.channel;
    const status = await getServerSnapshot(env);
    const sent = await discordApi(env,`/channels/${channelId}/messages`,{method:"POST",body:JSON.stringify({embeds:[serverEmbed(status)]})});
    await env.DB.prepare("INSERT INTO status_message(id,channel_id,message_id) VALUES(1,?,?) ON CONFLICT(id) DO UPDATE SET channel_id=excluded.channel_id,message_id=excluded.message_id,updated_at=CURRENT_TIMESTAMP").bind(channelId,sent.id).run();
    return respond(`Server status embed created in <#${channelId}>. The Worker will refresh it automatically when its cron trigger is enabled.`);
  }

  if (["link", "sync", "unsync", "link.set", "link.unset"].includes(command)) {
    if (!(await hasAdminAccess(env, interaction))) return respond("You don’t have permission to manage website content.");
    if (command === "link" || command === "link.set" || command === "link.unset") {
      if (command === "link.set" || args.set) {
        const key = args.key ?? args.set?.key;
        const url = args.url ?? args.set?.url;
        if (!["discord", "youtube", "modpack", "bluemap", "donate"].includes(key) || !/^https?:\/\//i.test(url || "")) return respond("Choose a supported link key and provide a valid http(s) URL.");
        await env.DB.prepare("INSERT INTO website_links(link_key,url,updated_by) VALUES(?,?,?) ON CONFLICT(link_key) DO UPDATE SET url=excluded.url,updated_by=excluded.updated_by,updated_at=CURRENT_TIMESTAMP").bind(key, url, userId).run();
        return respond(`Updated website link: **${key}**.`);
      }
      const key = args.key ?? args.unset?.key;
      if (!["discord", "youtube", "modpack", "bluemap", "donate"].includes(key)) return respond("Choose discord, youtube, modpack, bluemap, or donate.");
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

  const listed = await discordApi(env,`/guilds/${env.ALLOWED_GUILD_ID}/scheduled-events?with_user_count=true`);
  const eventsById = new Map((listed || []).map(event => [String(event.id), event]));
  const knownPosts = await env.DB.prepare(
    "SELECT post_id,source_message_id,event_data_json FROM published_posts WHERE source_guild_id=? AND source_channel_id='discord-event' AND category='events'"
  ).bind(env.ALLOWED_GUILD_ID).all();

  // Discord's guild event list is the authoritative indicator for this feed:
  // once a published event disappears from it, keep its website post as ended.
  // Do not individually fetch absent events, since that endpoint can return a
  // stale active status and incorrectly restore "Started".
  for (const post of knownPosts.results || []) {
    const eventId = String(post.source_message_id || "");
    if (!eventId || eventsById.has(eventId)) continue;
    let prior = {};
    try { prior = JSON.parse(post.event_data_json || "{}"); } catch {}
    const endedData = { ...prior, id:eventId, eventId, status:3, statusText:"ended" };
    await env.DB.prepare("UPDATE published_posts SET event_data_json=?,updated_at=CURRENT_TIMESTAMP WHERE post_id=?")
      .bind(JSON.stringify(endedData), post.post_id).run();
  }

  for (const event of eventsById.values()) {
    const channelId = "discord-event";
    // Discord status 3 = completed and 4 = cancelled. Both are terminal
    // for the website feed: keep the event in Past events as "Ended".
    const terminalStatus = Number(event.status) === 3 || Number(event.status) === 4;
    const websiteStatus = terminalStatus ? 3 : Number(event.status);

    const coverHash = typeof event.image === "string" ? event.image : typeof event.cover_image === "string" ? event.cover_image : null;
    const coverExtension = coverHash?.startsWith("a_") ? "gif" : "png";
    const coverUrl = coverHash ? `https://cdn.discordapp.com/guild-events/${event.id}/${coverHash}.${coverExtension}?size=1024` : null;
    const images = coverUrl ? [coverUrl] : [];
    let channelName = null;
    if (event.channel_id) {
      try {
        const channel = await discordApi(env, `/channels/${event.channel_id}`);
        channelName = channel?.name || null;
      } catch {
        // Scheduled-event metadata still contains the channel ID even when the
        // bot cannot view that channel. Keep a useful linked fallback in the
        // website event card rather than dropping the venue entirely.
      }
      if (!channelName) channelName = "Discord channel";
    }
    const eventData = {
      id:event.id,eventId:event.id,coverImage:coverUrl,coverHash,
      scheduledStartTime:event.scheduled_start_time,scheduledEndTime:event.scheduled_end_time,
      entityType:event.entity_type,location:event.entity_metadata?.location || null,
      channelId:event.channel_id || null,channelName,guildId:env.ALLOWED_GUILD_ID,
      userCount:event.user_count || 0,status:websiteStatus,
      statusText:terminalStatus ? "ended" : (Number(event.status) === 2 ? "started" : "scheduled"),
      creatorId:event.creator_id
    };
    const deleted = await env.DB.prepare("SELECT value FROM bot_config WHERE key=?").bind("deleted_discord_event_" + event.id).first();
    if (deleted?.value === "deleted") continue;
    const existing = await env.DB.prepare("SELECT post_id FROM published_posts WHERE source_guild_id=? AND source_channel_id=? AND source_message_id=? AND category='events'").bind(env.ALLOWED_GUILD_ID,channelId,event.id).first();
    if (existing) {
      await env.DB.prepare("UPDATE published_posts SET title=?,body=?,image_urls_json=?,event_data_json=?,updated_at=CURRENT_TIMESTAMP WHERE post_id=?")
        .bind(cleanText(event.name,180),cleanText(event.description,4000),JSON.stringify(images),JSON.stringify(eventData),existing.post_id).run();
    } else {
      const six = await nextSixDigitId(env);
      await env.DB.prepare("INSERT INTO published_posts(post_id,six_digit_id,category,source_guild_id,source_channel_id,source_message_id,title,body,image_urls_json,event_data_json) VALUES(?,?,?,?,?,?,?,?,?,?)")
        .bind("discord-event-" + event.id,six,"events",env.ALLOWED_GUILD_ID,channelId,event.id,cleanText(event.name,180),cleanText(event.description,4000),JSON.stringify(images),JSON.stringify(eventData)).run();
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
      const images = await storeMessageImages(env, message, `sync-${item.category}-${message.id}`);
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

async function ensureGuildCommands(env) {
  const revision = "public-links-commands-v2";
  const current = await env.DB.prepare("SELECT value FROM bot_config WHERE key='registered_command_revision'").first();
  if (current?.value === revision) return;
  if (!env.DISCORD_BOT_TOKEN || !env.DISCORD_APPLICATION_ID || !env.ALLOWED_GUILD_ID) throw new Error("Cannot register Discord commands: required bindings are missing");
  const response = await fetch(`https://discord.com/api/v10/applications/${env.DISCORD_APPLICATION_ID}/guilds/${env.ALLOWED_GUILD_ID}/commands`, {
    method: "PUT",
    headers: { "Authorization": `Bot ${env.DISCORD_BOT_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(REGISTERED_COMMANDS)
  });
  if (!response.ok) throw new Error("Discord command registration failed (" + response.status + "): " + (await response.text()).slice(0, 500));
  await env.DB.prepare("INSERT INTO bot_config(key,value) VALUES('registered_command_revision',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP").bind(revision).run();
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
    const query=batch.map(login=>"login="+encodeURIComponent(login)).join("&");
    const usersResponse=await fetch("https://api.twitch.tv/helix/users?"+query,{
      headers:{"Client-Id":env.TWITCH_CLIENT_ID,"Authorization":`Bearer ${token.access_token}`}
    });
    if (usersResponse.ok) {
      const users=await usersResponse.json();
      for (const user of (users.data || [])) {
        if (user.profile_image_url) await env.DB.prepare("INSERT INTO bot_config(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP")
          .bind("twitch_avatar_"+user.login.toLowerCase(),user.profile_image_url).run();
        if (user.display_name) await env.DB.prepare("INSERT INTO bot_config(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=CURRENT_TIMESTAMP")
          .bind("twitch_display_name_"+user.login.toLowerCase(),user.display_name).run();
      }
    }
  }
  for (let i=0;i<logins.length;i+=100) {
    const batch=logins.slice(i,i+100);
    const query=batch.map(login=>"user_login="+encodeURIComponent(login)).join("&");
    const response=await fetch("https://api.twitch.tv/helix/streams?"+query,{
      headers:{"Client-Id":env.TWITCH_CLIENT_ID,"Authorization":`Bearer ${token.access_token}`}
    });
    if (!response.ok) throw new Error("Twitch stream lookup failed");
    const data=await response.json();
    const live=new Map((data.data || []).map(stream=>[stream.user_login.toLowerCase(),stream]));
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
    const jobs = [ensureGuildCommands(env), syncDiscordEvents(env), syncConfiguredChannels(env)];
    if (minute % 5 === 0) jobs.push(refreshStatusMessage(env), refreshTwitchCreators(env));
    ctx.waitUntil(Promise.allSettled(jobs).then(results => {
      for (const result of results) if (result.status === "rejected") console.error("Scheduled job failed:", String(result.reason?.message || result.reason));
    }));
  },
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/") return json({ ok: true, service: "notesmp-discord-worker" });

    const setupPath = url.pathname === "/setup" || url.pathname === "/setup/register-commands" || url.pathname === "/setup/migrate";
    if (request.method === "OPTIONS" && setupPath) {
      return new Response(null, { status: 204, headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Authorization, Content-Type",
        "Access-Control-Max-Age": "86400",
        "Vary": "Origin"
      }});
    }


    if (request.method === "POST" && url.pathname === "/setup/migrate") {
      const secret = env.COMMAND_SETUP_SECRET;
      const authorization = request.headers.get("Authorization") || "";
      if (!secret || (authorization !== secret && authorization !== `Bearer ${secret}`)) return setupJson({error:"Unauthorized"},401);
      await env.DB.exec(`
        CREATE TABLE IF NOT EXISTS bot_config (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS access_entries (entry_type TEXT NOT NULL CHECK (entry_type IN ('user','role')), discord_id TEXT NOT NULL, added_by TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(entry_type, discord_id));
        CREATE TABLE IF NOT EXISTS published_posts (post_id TEXT PRIMARY KEY, six_digit_id TEXT NOT NULL UNIQUE, category TEXT NOT NULL, group_name TEXT, source_guild_id TEXT NOT NULL, source_channel_id TEXT NOT NULL, source_message_id TEXT NOT NULL, author_discord_id TEXT, linked_minecraft_uuid TEXT, linked_minecraft_name TEXT, title TEXT, subtitle TEXT, body TEXT NOT NULL DEFAULT '', image_urls_json TEXT NOT NULL DEFAULT '[]', event_data_json TEXT, published_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(source_guild_id, source_channel_id, source_message_id, category));
        CREATE INDEX IF NOT EXISTS idx_posts_category_date ON published_posts(category, published_at DESC);
        CREATE TABLE IF NOT EXISTS channel_sync (category TEXT PRIMARY KEY CHECK(category IN ('rules','updates')), channel_id TEXT NOT NULL, configured_by TEXT, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS website_links (link_key TEXT PRIMARY KEY CHECK(link_key IN ('discord','youtube','modpack','bluemap','donate')), url TEXT NOT NULL, updated_by TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS verification_codes (code TEXT PRIMARY KEY, discord_user_id TEXT NOT NULL UNIQUE, expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL);
        CREATE INDEX IF NOT EXISTS idx_verification_expiry ON verification_codes(expires_at);
        CREATE TABLE IF NOT EXISTS account_links (discord_user_id TEXT PRIMARY KEY UNIQUE, minecraft_uuid TEXT NOT NULL UNIQUE, minecraft_name TEXT NOT NULL, linked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS creators (twitch_login TEXT PRIMARY KEY, added_by TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, last_checked_at TEXT, live_started_at TEXT, live_title TEXT, live_url TEXT, live_thumbnail_url TEXT);
        CREATE TABLE IF NOT EXISTS status_message (id INTEGER PRIMARY KEY CHECK(id=1), channel_id TEXT NOT NULL, message_id TEXT, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS server_state (id INTEGER PRIMARY KEY CHECK(id=1), online INTEGER NOT NULL DEFAULT 0, players_online INTEGER NOT NULL DEFAULT 0, max_players INTEGER NOT NULL DEFAULT 0, motd TEXT NOT NULL DEFAULT '', version TEXT, online_players_json TEXT NOT NULL DEFAULT '[]', updated_at TEXT);
        INSERT OR IGNORE INTO server_state (id, online, players_online, max_players, motd, online_players_json) VALUES (1,0,0,0,'','[]');
        CREATE TABLE IF NOT EXISTS players (uuid TEXT PRIMARY KEY, username TEXT NOT NULL, first_join TEXT, last_seen TEXT, playtime_seconds INTEGER NOT NULL DEFAULT 0, blocks_broken INTEGER NOT NULL DEFAULT 0, blocks_placed INTEGER NOT NULL DEFAULT 0, deaths INTEGER NOT NULL DEFAULT 0, kills INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
        CREATE INDEX IF NOT EXISTS idx_players_username ON players(username COLLATE NOCASE);
        CREATE INDEX IF NOT EXISTS idx_players_playtime ON players(playtime_seconds DESC);
        CREATE INDEX IF NOT EXISTS idx_players_last_seen ON players(last_seen DESC);
        CREATE TABLE IF NOT EXISTS verification_requests (code TEXT PRIMARY KEY, discord_user_id TEXT NOT NULL UNIQUE, minecraft_name TEXT NOT NULL, expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL);
        CREATE INDEX IF NOT EXISTS idx_verification_requests_expiry ON verification_requests(expires_at);
        CREATE TABLE IF NOT EXISTS player_statistics (minecraft_uuid TEXT NOT NULL, stat_id TEXT NOT NULL, stat_value REAL NOT NULL DEFAULT 0, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(minecraft_uuid,stat_id));
        CREATE INDEX IF NOT EXISTS idx_player_statistics_uuid ON player_statistics(minecraft_uuid);
        CREATE TABLE IF NOT EXISTS channel_sync_state (category TEXT PRIMARY KEY, last_message_id TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
      `);
      const linksSchema = await env.DB.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='website_links'").first();
      if (linksSchema?.sql && !linksSchema.sql.includes("'donate'")) {
        await env.DB.exec(`
          CREATE TABLE website_links_next (link_key TEXT PRIMARY KEY CHECK(link_key IN ('discord','youtube','modpack','bluemap','donate')), url TEXT NOT NULL, updated_by TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
          INSERT OR IGNORE INTO website_links_next(link_key,url,updated_by,updated_at) SELECT link_key,url,updated_by,updated_at FROM website_links;
          DROP TABLE website_links;
          ALTER TABLE website_links_next RENAME TO website_links;
        `);
      }
      return new Response(JSON.stringify({ok:true,migrated:["bot_config","access_entries","published_posts","channel_sync","website_links","verification_codes","account_links","creators","status_message","server_state","players","verification_requests","player_statistics","channel_sync_state"]}), {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store",
          "Access-Control-Allow-Origin": "*",
          "Vary": "Origin"
        }
      });
    }

    if (request.method === "POST" && setupPath && url.pathname !== "/setup/migrate") {
      const setupSecret = env.COMMAND_SETUP_SECRET;
      const authorization = request.headers.get("Authorization") || "";
      if (!setupSecret || (authorization !== setupSecret && authorization !== `Bearer ${setupSecret}`)) return setupJson({ error: "Unauthorized" }, 401);
      if (!env.DISCORD_BOT_TOKEN || !env.DISCORD_APPLICATION_ID || !env.ALLOWED_GUILD_ID) {
        return setupJson({ error: "Missing required Worker bindings: DISCORD_BOT_TOKEN, DISCORD_APPLICATION_ID, ALLOWED_GUILD_ID" }, 500);
      }
      const discordResponse = await fetch(`https://discord.com/api/v10/applications/${env.DISCORD_APPLICATION_ID}/guilds/${env.ALLOWED_GUILD_ID}/commands`, {
        method: "PUT",
        headers: { "Authorization": `Bot ${env.DISCORD_BOT_TOKEN}`, "Content-Type": "application/json" },
        body: JSON.stringify(REGISTERED_COMMANDS)
      });
      if (!discordResponse.ok) {
        const details = await discordResponse.text();
        console.error("Command registration rejected by Discord:", discordResponse.status, details);
        return setupJson({ error: "Discord rejected command registration", status: discordResponse.status, details }, 502);
      }
      const registered = await discordResponse.json();
      return new Response(JSON.stringify({ ok: true, registered: registered.length, commands: registered.map(command => command.name) }), {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-store",
          "Access-Control-Allow-Origin": "*",
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
      const stats = payload.statistics && typeof payload.statistics === "object"
        ? Object.entries(payload.statistics).filter(([statId,value]) => /^[a-z0-9_.:-]{1,100}$/i.test(statId) && Number.isFinite(Number(value)) && Number(value) >= 0)
        : [];
      const statements = stats.map(([statId,value]) => env.DB.prepare("INSERT INTO player_statistics(minecraft_uuid,stat_id,stat_value) VALUES(?,?,?) ON CONFLICT(minecraft_uuid,stat_id) DO UPDATE SET stat_value=excluded.stat_value,updated_at=CURRENT_TIMESTAMP").bind(uuid,statId,Number(value)));
      for (let i = 0; i < statements.length; i += 100) await env.DB.batch(statements.slice(i,i+100));
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
      const topOption = interaction.data?.options?.[0];
      const isGalleryAdd = interaction.data?.name === "ws" &&
        topOption?.type === 2 && topOption.name === "gallery" &&
        topOption.options?.[0]?.type === 1 && topOption.options[0].name === "add";
      if (isGalleryAdd) {
        if (!env.DISCORD_APPLICATION_ID || !interaction.token) return respond("The interaction could not be deferred.");
        ctx.waitUntil((async () => {
          let payload;
          try {
            const result = await handle(interaction, env);
            payload = await result.json();
            if (payload?.type === 4 && payload.data) {
              const edit = await fetch(`https://discord.com/api/v10/webhooks/${env.DISCORD_APPLICATION_ID}/${interaction.token}/messages/@original`, {
                method: "PATCH",
                headers: { "Authorization": `Bot ${env.DISCORD_BOT_TOKEN}`, "Content-Type": "application/json" },
                body: JSON.stringify(payload.data)
              });
              if (!edit.ok) console.error("Deferred gallery response edit failed:", edit.status, (await edit.text()).slice(0, 500));
            }
          } catch (error) {
            console.error("Deferred gallery add failed:", String(error?.stack || error?.message || error));
            const message = { content: "Gallery upload failed. Check the Worker logs for details.", flags: 64, allowed_mentions: { parse: [] } };
            const edit = await fetch(`https://discord.com/api/v10/webhooks/${env.DISCORD_APPLICATION_ID}/${interaction.token}/messages/@original`, {
              method: "PATCH",
              headers: { "Authorization": `Bot ${env.DISCORD_BOT_TOKEN}`, "Content-Type": "application/json" },
              body: JSON.stringify(message)
            });
            if (!edit.ok) console.error("Deferred gallery error response failed:", edit.status, (await edit.text()).slice(0, 500));
          }
        })());
        return json({ type: 5, data: { flags: 64 } });
      }
      try { return await handle(interaction, env); }
      catch (error) {
        console.error("Interaction handler failed:", String(error?.message || error));
        return respond("The command failed. Please check the Worker logs or try again.");
      }
    }
    return json({ error: "Unsupported interaction type" }, 400);
  },
};
;