# NoteSMP Discord Bot

Cloudflare Worker-based Discord application for NoteSMP. It uses Discord Interactions (HTTP) rather than a persistent Gateway process.

## What it does

- Publishes Discord messages and gallery content to the NoteSMP website.
- Manages website news, links, sync channels, posts, and authorized administrators.
- Exposes Minecraft account verification and public player statistics commands.
- Maintains a Discord server-status message and Twitch creator listing through the NoteSMP API.

## Deploy / configure

1. Deploy this repository as the `notesmp-bot` Cloudflare Worker using `wrangler.jsonc`.
2. Bind the Cloudflare D1 database as `DB` (database name: `notesmp-data`).
3. Apply the bot database schema in `schema.sql` to that database.
4. Configure Worker variables/secrets:
   - `DISCORD_PUBLIC_KEY` — Discord application's public key.
   - `DISCORD_APPLICATION_ID` — Discord application ID.
   - `DISCORD_BOT_TOKEN` — bot token; keep secret.
   - `OWNER_DISCORD_ID` — owner Discord user ID.
   - `ALLOWED_GUILD_ID` — NoteSMP Discord server ID.
   - `NOTESMP_API_URL` — base URL of the NoteSMP API Worker.
   - `MINECRAFT_API_KEY` — shared secret used by Minecraft/API verification and stats routes, if those features are enabled.
   - Twitch client credentials, if used by the creator stream integration.
5. Set Discord's Interactions Endpoint URL to `https://<worker-host>/interactions`.
6. Register the application commands using the command registration/setup route or deployment workflow, then test in the allowed guild.

Never commit tokens, API keys, or other credentials. Use Cloudflare Worker secrets for sensitive values.

## Slash command reference

Discord commands are invoked with `/`. Required options are marked **required**; optional ones may be omitted. Some commands are owner-only or require the bot's configured website-admin access.

### General

| Command | Usage | Description |
|---|---|---|
| `/help` | `/help` | Shows a short bot help message. |

### Website administrator access

Owner-only access management.

| Command | Usage | Description |
|---|---|---|
| `/access add` | `/access add target:<user-or-role>` | Grants website-admin access to a Discord user or role. |
| `/access remove` | `/access remove target:<user-or-role>` | Revokes website-admin access. |
| `/access list` | `/access list` | Lists configured user and role access entries. |

### Website links

Requires website-admin access.

| Command | Usage | Description |
|---|---|---|
| `/link set` | `/link set key:<discord\|youtube\|modpack\|bluemap> url:<https-url>` | Sets or replaces a website link. |
| `/link unset` | `/link unset key:<discord\|youtube\|modpack\|bluemap>` | Removes the selected website link. |

### Auto-publishing / channel sync

Requires website-admin access.

| Command | Usage | Description |
|---|---|---|
| `/sync` | `/sync category:<rules\|updates> channel:<channel>` | Enables publishing from the selected Discord channel. |
| `/unsync` | `/unsync category:<rules\|updates>` | Stops syncing the selected category. |

### Publish a gallery item

Requires website-admin access. The source message is read from the channel where the command is run.

| Command | Usage | Description |
|---|---|---|
| `/publish` | `/publish message_id:<id> gallery_category:<events\|buildings\|places\|inprogress> dimension:<overworld\|nether\|end> [title] [subtitle] [coordinates]` | Publishes a Discord message and its images to the website gallery. Coordinates use three values, e.g. `120, 64, -30`. |

### Published posts

Requires website-admin access. Post IDs are six-digit IDs returned when publishing.

| Command | Usage | Description |
|---|---|---|
| `/post remove` | `/post remove post_id:<six-digit-id>` | Deletes a published post. |
| `/post update` | `/post update post_id:<six-digit-id>` | Refreshes a synced Rules/Updates post from its source Discord message. Not for gallery posts. |
| `/post modify` | `/post modify post_id:<six-digit-id> title:<text> subtitle:<text> category:<events\|buildings\|places\|inprogress> dimension:<overworld\|nether\|end> [coordinates]` | Edits gallery metadata without re-fetching its source message. |

### Twitch creators

Requires website-admin access.

| Command | Usage | Description |
|---|---|---|
| `/creator add` | `/creator add twitchname:<username>` | Adds a Twitch creator to the website creator list. |
| `/creator remove` | `/creator remove twitchname:<username>` | Removes a creator. |

### Minecraft account linking

| Command | Usage | Description |
|---|---|---|
| `/verify` | `/verify playername:<Minecraft-username>` | Starts account linking and returns a verification code. Complete the in-game/plugin verification flow before it expires. |
| `/unverify` | `/unverify discord_user:<user> minecraft_uuid:<UUID>` | Removes a Discord/Minecraft account link. Use the linked Discord account and Minecraft UUID. |

### Player statistics

| Command | Usage | Description |
|---|---|---|
| `/playerstats` | `/playerstats [playername:<username>] [discord_user:<user>] [stat:<stat-id>]` | Looks up public stats by Minecraft name or linked Discord account. The optional stat ID can be a Minecraft statistic key such as `minecraft:mob_kills`. Supply the identity option and optionally a statistic key. |

### News

| Command | Usage | Description |
|---|---|---|
| `/news set maintenance` | `/news set maintenance reason:<text> [timestamp:<10-digit-Unix-seconds>] [duration:<duration>]` | Sets a maintenance news item. Duration examples: `2h`, `30m`, `1d4h30m`. Timestamp is Unix time in seconds. |
| `/news set warning` | `/news set warning title:<text> subtitle:<text>` | Sets the active warning news item. |
| `/news set info` | `/news set info title:<text> subtitle:<text>` | Sets the active informational news item. |
| `/news unset remove` | `/news unset remove` | Removes the active news item. |

The active news area is intended for the current announcement; a new set command replaces the prior item.

### Live server status

| Command | Usage | Description |
|---|---|---|
| `/serverstatus sendmessage` | `/serverstatus sendmessage channel:<channel>` | Creates or replaces the status embed in the selected Discord channel. |

## Local development

Install Wrangler and authenticate with Cloudflare:

```bash
npm install --save-dev wrangler
npx wrangler login
npx wrangler dev
```

Deploy:

```npx wrangler deploy
```

## Architecture

Discord sends signed interaction requests to the Worker. The Worker verifies signatures, restricts interactions to the configured guild, uses D1 for persisted configuration/content, and calls the NoteSMP API for Minecraft/server data.
