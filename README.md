# NoteSMP Discord Bot

Discord interactions run through a Cloudflare Worker. This is event-driven and does not require a permanently running Discord Gateway process.

## Setup
1. Deploy this repository as a Cloudflare Worker using `wrangler.jsonc`.
2. Bind the existing D1 database `notesmp-data` as `DB`.
3. Set Worker secrets: `DISCORD_PUBLIC_KEY`, `DISCORD_APPLICATION_ID`, `DISCORD_BOT_TOKEN`, and `OWNER_DISCORD_ID`.
4. Set `ALLOWED_GUILD_ID` to the official NoteSMP Discord server ID. Replace the placeholder before production.
5. Apply `schema.sql` to the bound D1 database.
6. Set the Discord Developer Portal Interactions Endpoint URL to `https://<worker-host>/interactions`.
7. Register guild-scoped application commands after setting the application and guild IDs.

Never commit credentials. The owner ID is a bootstrap authority to prevent access-management lockout. Current code implements signature verification, guild restriction, `/help`, and an unavailable-command fallback; publishing and access-management handlers are the next build stage.
