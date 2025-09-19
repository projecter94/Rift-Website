import fetch from "node-fetch";

export default async function handler(req, res) {
  const code = req.query.code;
  if (!code) {
    return res.status(400).json({ ok: false, message: "Missing code" });
  }

  try {
    // Exchange code for token
    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri: "https://riftverify.vercel.app/callback"
      })
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      return res.status(400).json({ ok: false, message: "Token exchange failed", error: tokenData });
    }

    // Fetch user info
    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `${tokenData.token_type} ${tokenData.access_token}` }
    });

    const user = await userRes.json();

    // Example success response
    return res.status(200).json({
      ok: true,
      message: "✅ Verification success",
      id: user.id,
      username: user.username
    });

  } catch (err) {
    return res.status(500).json({ ok: false, message: "Server error", error: err.message });
  }
}
