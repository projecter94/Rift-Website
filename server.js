// server.js (CommonJS)
const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();
const PORT = 3000;

if (typeof fetch === "undefined") {
  console.error("No global fetch available. Use Node 18+ or install node-fetch.");
  process.exit(1);
}

app.use(express.json());
app.use(express.static(__dirname));

const LOG_FILE = path.join(__dirname, "log.json");
if (!fs.existsSync(LOG_FILE)) fs.writeFileSync(LOG_FILE, JSON.stringify([]));

// --- shared config + bot token ---
const configPath = path.join(__dirname, "../shared/config.json");
const sharedConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
const DISCORD_TOKEN = sharedConfig.token;

// put these in .env ideally
const CLIENT_ID = "1414249331531321437";
const CLIENT_SECRET = "fwJHilkppGT_s8bw3U_paY-3Z4UgDX11"; // ⚠️ replace with your secret
const REDIRECT_URI = "https://riftverify.vercel.app/api/auth/discord/redirect";

// helpers
function loadLogs(){ try { return JSON.parse(fs.readFileSync(LOG_FILE,"utf8")||"[]"); } catch(e){ return []; } }
function saveLogs(logs){ fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2)); }
function getClientIp(req){
  const xff = req.headers["x-forwarded-for"];
  if (xff) return xff.split(",")[0].trim();
  return req.socket.remoteAddress || "";
}
async function lookupIpApi(ip){
  if(!ip || ip === "::1" || ip === "127.0.0.1" || ip.startsWith("::ffff:127.0.0.1")) return null;
  try{
    const r = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`);
    if(!r.ok) return null;
    return await r.json();
  }catch(e){ console.error("ipapi error", e?.message); return null; }
}
async function reverseGeocode(lat, lon){
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&addressdetails=1`;
  try{
    const r = await fetch(url, { headers: { "User-Agent": "RiftVerification/1.0 (contact@example.com)" }, timeout: 8000 });
    if(!r.ok) return null;
    return await r.json();
  }catch(e){ console.error("reverse geocode error", e?.message); return null; }
}
function haversineKm(lat1, lon1, lat2, lon2){
  const toRad = v => v * Math.PI/180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1))*Math.cos(toRad(lat2))*Math.sin(dLon/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// --- assign role helper ---
async function assignRole(userId) {
  let config = {};
  try {
    config = JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch (e) {
    console.error("Failed to read config.json", e);
    return;
  }

  if (!config.guildId || !config.roleId) {
    console.error("Config missing guildId/roleId");
    return;
  }

  const url = `https://discord.com/api/v10/guilds/${config.guildId}/members/${userId}/roles/${config.roleId}`;
  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "Authorization": `Bot ${DISCORD_TOKEN}`,
      "Content-Type": "application/json"
    }
  });

  if (!res.ok) {
    console.error("Failed to assign role:", await res.text());
  } else {
    console.log(`Assigned role ${config.roleId} to user ${userId}`);
  }
}

// --- verification helper ---
async function runVerification(userId, hwid, precise, req) {
  const ip = getClientIp(req);
  const logs = loadLogs();

  // check duplicates
  const foundDirect = logs.find(e => e.hwid === hwid || e.ip === ip);
  if (foundDirect) return { ok: false, reason: "alt" };

  // check precise duplicates
  if (precise?.latitude && precise?.longitude) {
    for (const e of logs) {
      if (e.precise?.latitude && e.precise?.longitude) {
        const distKm = haversineKm(
          precise.latitude, precise.longitude,
          e.precise.latitude, e.precise.longitude
        );
        if (distKm <= 0.05) {
          return { ok: false, reason: "alt" };
        }
      }
    }
  }

  // lookup IP info
  const ipGeo = await lookupIpApi(ip);

  // VPN detection
  if (ipGeo && (ipGeo.proxy === true || (ipGeo.org && /(vpn|hosting|cloud|proxy)/i.test(ipGeo.org)))) {
    return { ok: false, reason: "vpn" };
  }

  // reverse geocode precise coords if provided
  let reverse = null;
  if (precise?.latitude && precise?.longitude) {
    reverse = await reverseGeocode(precise.latitude, precise.longitude);
  }

  // save new entry
  const entry = {
    hwid: hwid || "oauth2", // if no hwid provided
    ip,
    userId,
    time: new Date().toISOString(),
    geo: ipGeo || null,
    precise: precise || null,
    reverse: reverse || null
  };
  logs.push(entry);
  saveLogs(logs);

  // assign role
  await assignRole(userId);

  return { ok: true, reason: "success" };
}

// --- OAUTH2 REDIRECT HANDLER ---
app.get("/api/auth/discord/redirect", async (req, res) => {
  const code = req.query.code;
  if (!code) return res.redirect("https://riftverify.vercel.app/fail?msg=Missing+OAuth2+code");

  try {
    // Step 1: exchange code for access token
    const tokenRes = await fetch("https://discord.com/api/v10/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI
      })
    });

    if (!tokenRes.ok) {
      console.error(await tokenRes.text());
      return res.redirect("https://riftverify.vercel.app/fail?msg=Token+error");
    }
    const tokenData = await tokenRes.json();

    // Step 2: fetch user info
    const userRes = await fetch("https://discord.com/api/v10/users/@me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });

    if (!userRes.ok) {
      console.error(await userRes.text());
      return res.redirect("https://riftverify.vercel.app/fail?msg=User+fetch+error");
    }
    const user = await userRes.json();

    // Step 3: run verification
    const result = await runVerification(user.id, null, null, req);

    // Step 4: redirect to proper page
    if (result.ok) {
      return res.redirect(`https://riftverify.vercel.app/success?user=${encodeURIComponent(user.username)}`);
    } else if (result.reason === "alt") {
      return res.redirect("https://riftverify.vercel.app/alt");
    } else if (result.reason === "vpn") {
      return res.redirect("https://riftverify.vercel.app/vpn");
    } else {
      return res.redirect("https://riftverify.vercel.app/fail?msg=Unknown+reason");
    }

  } catch (err) {
    console.error("OAuth2 redirect error:", err);
    res.redirect("https://riftverify.vercel.app/fail?msg=OAuth2+error");
  }
});

// --- Verification route ---
app.post("/verify", async (req, res) => {
  try {
    const { hwid, precise, userId } = req.body || {};
    if (!hwid) return res.status(400).json({ ok:false, message:"HWID missing" });
    if (!userId) return res.status(400).json({ ok:false, message:"User ID missing" });

    const result = await runVerification(userId, hwid, precise, req);

    if (result.ok) {
      return res.json({ ok:true, message:"✅ You have been verified successfully!" });
    } else if (result.reason === "alt") {
      return res.json({ ok:false, message:"❌ Alt account detected!" });
    } else if (result.reason === "vpn") {
      return res.json({ ok:false, message:"❌ VPN detected. Disable it to verify." });
    } else {
      return res.json({ ok:false, message:"❌ Verification failed (unknown reason)" });
    }
  } catch (err) {
    console.error("verify error", err?.stack || err);
    return res.status(500).json({ ok:false, message:"Server error" });
  }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
