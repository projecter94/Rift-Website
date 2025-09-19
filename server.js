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

app.post("/verify", async (req, res) => {
  try {
    const { hwid, precise } = req.body || {};
    if (!hwid) return res.status(400).json({ ok:false, message:"HWID missing" });

    const ip = getClientIp(req);
    const logs = loadLogs();

    // check duplicates
    const foundDirect = logs.find(e => e.hwid === hwid || e.ip === ip);
    if (foundDirect) return res.json({ ok:false, message:"❌ Alt account detected!" });

    // check precise duplicates
    if (precise?.latitude && precise?.longitude) {
      for (const e of logs) {
        if (e.precise?.latitude && e.precise?.longitude) {
          const distKm = haversineKm(precise.latitude, precise.longitude, e.precise.latitude, e.precise.longitude);
          if (distKm <= 0.05) {
            return res.json({ ok:false, message:"❌ Alt account detected (same location)!" });
          }
        }
      }
    }

    // lookup IP info
    const ipGeo = await lookupIpApi(ip);

    // VPN detection
    if (ipGeo && (ipGeo.proxy === true || (ipGeo.org && /(vpn|hosting|cloud|proxy)/i.test(ipGeo.org)))) {
      return res.json({ ok:false, message:"❌ VPN detected. Please disable it to verify." });
    }

    // reverse geocode precise coords if provided
    let reverse = null;
    if (precise?.latitude && precise?.longitude) {
      reverse = await reverseGeocode(precise.latitude, precise.longitude);
    }

    // save new entry
    const entry = {
      hwid,
      ip,
      time: new Date().toISOString(),
      geo: ipGeo || null,
      precise: precise || null,
      reverse: reverse || null
    };
    logs.push(entry);
    saveLogs(logs);

    return res.json({ ok:true, message:"✅ You have been verified successfully!" });
  } catch (err) {
    console.error("verify error", err?.stack || err);
    return res.status(500).json({ ok:false, message:"Server error" });
  }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
