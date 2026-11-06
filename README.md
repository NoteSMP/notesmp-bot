# NoteSMP Discord Bot

Discord application for NoteSMP, implemented as a Cloudflare Worker using Discord HTTP Interactions. It does not require a permanently running Gateway client.

- **Worker:** `notesmp-bot`
- **Interactions endpoint:** `https://notesmp-bot.notesmp-de.workers.dev/interactions`
- **Database:** shared Cloudflare D1 database `notesmp-data`, binding `DB`
- **API:** `https://notesmp-api.notesmp-de.workers.dev`
- **Entry point:** `src/index.js`

## Features

- Discord slash commands for website administration and publishing.
- Publishes gallery posts and synced Discord content to the NoteSMP website.
- Manages website links, active news, creator entries and channel synchronization.
- Supports Minecraft/Discord account verification and public player-stat lookups.
- Publishes or refreshes the Discord server-status message.
- Uses D1 for persistent configuration, access control and synchronized content.

## Deployment and setup

1. Deploy this repository as the `notesmp-bot` Worker using `wrangler.jsonc`.
2. Confirm the `DB` binding points to `notesmp-data`.
3. Configure the Worker variables and secrets below.
4. Set Discord's Interactions Endpoint URL to `https://notesmp-bot.notesmp-de.workers.dev/interactions`.
5. Register or refresh the Discord application commands using the repository's supported registration workflow.
6. Test commands in the configured NoteSMP guild.

### Required configuration

| Name | Type | Purpose |
|---|---|---|
| `ALLOWED_GUILD_ID` | Variable | Restricts guild interactions to the NoteSMP Discord server. |
| `NOTESMP_API_URL` | Variable | Base URL of the NoteSMP API Worker. |
| `DISCORD_PUBLIC_KEY` | Secret | Verifies signed Discord interaction requests. |
| `DISCORD_APPLICATION_ID` | Variable/secret | Discord application ID used for command registration. |
| `DISCORD_BOT_TOKEN` | Secret | Bot token for Discord REST operations. |
| `OWNER_DISCORD_ID` | Variable/secret | Owner-only administrative authorization. |
| `MINECRAFT_API_KEY` | Secret | Shared key for protected Minecraft/API operations. |
| Twitch credentials | Secrets | Used when Twitch creator lookups are enabled. |

Use Cloudflare Worker secrets for credentials. Never commit real tokens, IDs that are treated as secrets, or API keys.

## Slash commands

The command implementation in `src/index.js` is the source of truth. Current command groups include:

- `/help`
- `/access add|remove|list`
- `/link set|unset`
- `/sync` and `/unsync`
- `/publish`
- `/post remove|update|modify`
- `/creator add|remove`
- `/verify` and `/unverify`
- `/playerstats`
- `/news set|unset`
- `/serverstatus sendmessage`

Some commands require website-admin access; access-management operations are owner-only. The command schema and required option names can change, so consult the current Discord command definitions in the source rather than relying on copied examples.

## Minecraft account verification

1. A player starts linking with `/verify` in Discord and receives a short-lived, single-use code privately.
2. The player enters `/verify <six-digit-code>` in Minecraft.
3. The Paper plugin submits the code and Minecraft identity to the protected bot endpoint.
4. On success, the Discord account and Minecraft UUID/name are linked.

The plugin uses the shared `MINECRAFT_API_KEY`. Do not share verification codes with other users.

## Scheduled work

The Wrangler configuration runs the Worker Cron Trigger every minute. Scheduled work is handled by the Worker; no always-on server process is needed. Review the scheduled handler in `src/index.js` when changing sync cadence or maintenance behavior.

## Local development and deployment

```bash
npm install
npx wrangler dev
npx wrangler deploy
```

Set local secrets with Wrangler's secret commands or a local development secret file that is excluded from Git. Never commit `.dev.vars`.

## Data flow

Discord sends signed interaction requests to the Worker. The Worker validates the signature and guild, applies authorization checks, reads/writes D1, and calls the NoteSMP API for player and server information. The Minecraft Paper plugin talks to the protected bot/API endpoints for verification and player data.
