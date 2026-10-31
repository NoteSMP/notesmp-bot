/**
 * NoteSMP Discord interaction Worker.
 *
 * Verify Discord signatures before processing every interaction.
 * Guild-only behavior is enforced via ALLOWED_GUILD_ID.
 * No long-running Gateway connection is used.
 */
const encoder = new TextEncoder();

async function verifyDiscordRequest(request, body, publicKey) {
  const signature = request.headers.get("X-Signature-Ed25519");
  const timestamp = request.headers.get("X-Signature-Timestamp");
  if (!signature) return { ok: false, reason: "missing-signature-header" };
  if (!timestamp) return { ok: false, reason: "missing-timestamp-header" };
  if (typeof publicKey !== "string" || !publicKey.trim()) {
    return { ok: false, reason: "public-key-secret-missing-or-empty" };
  }

  // Reject stale requests to reduce replay risk.
  const seconds = Number(timestamp);
  if (!Number.isFinite(seconds) || Math.abs(Date.now() / 1000 - seconds) > 300) {
    return { ok: false, reason: "timestamp-outside-300-seconds" };
  }

  try {
    if (!/^[0-9a-fA-F]{64}$/.test(publicKey)) {
      return { ok: false, reason: "public-key-not-64-hex-characters" };
    }
    if (!/^[0-9a-fA-F]{128}$/.test(signature)) {
      return { ok: false, reason: "signature-not-128-hex-characters" };
    }
    const key = await crypto.subtle.importKey(
      "raw",
      Uint8Array.from(publicKey.match(/.{2}/g), (v) => parseInt(v, 16)),
      { name: "Ed25519" },
      false,
      ["verify"],
    );
    const sig = Uint8Array.from(signature.match(/.{2}/g), (v) => parseInt(v, 16));
    const ok = await crypto.subtle.verify("Ed25519", key, sig, encoder.encode(timestamp + body));
    return { ok, reason: ok ? "valid" : "cryptographic-signature-mismatch" };
  } catch (error) {
    return { ok: false, reason: "verification-exception", detail: String(error?.name || "unknown") };
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function interactionResponse(content, ephemeral = true) {
  return json({
    type: 4,
    data: {
      content,
      ...(ephemeral ? { flags: 64 } : {}),
      allowed_mentions: { parse: [] },
    },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/") {
      return json({ ok: true, service: "notesmp-discord-worker" });
    }
    if (request.method !== "POST" || url.pathname !== "/interactions") {
      return json({ error: "Not found" }, 404);
    }

    const body = await request.text();
    const verification = await verifyDiscordRequest(request, body, env.DISCORD_PUBLIC_KEY);
    if (!verification.ok) {
      // Diagnostic reason is safe to log; never log keys, signatures, or request bodies.
      console.warn("Discord signature verification failed:", verification.reason, verification.detail || "");
      return json({ error: "Invalid request signature" }, 401);
    }

    let interaction;
    try {
      interaction = JSON.parse(body);
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }

    // Discord PING handshake.
    if (interaction.type === 1) return json({ type: 1 });

    // Reject interactions outside the configured NoteSMP guild.
    if (!env.ALLOWED_GUILD_ID || interaction.guild_id !== env.ALLOWED_GUILD_ID) {
      return interactionResponse("This bot is only available in the official NoteSMP Discord server.");
    }

    if (interaction.type === 2) {
      const command = interaction.data?.name;
      if (command === "help") {
        return interactionResponse(
          "**NoteSMP Bot**\nThe bot is online. Commands are being added in stages.",
        );
      }
      return interactionResponse("That command is not available yet.");
    }

    return json({ error: "Unsupported interaction type" }, 400);
  },
};
