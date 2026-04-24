#!/usr/bin/env node
import "dotenv/config";

const command = process.argv[2];

if (command === "url") {
  const url = new URL("https://auth.mercadolibre.com.co/authorization");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", required("MERCADOLIBRE_CLIENT_ID"));
  url.searchParams.set("redirect_uri", required("MERCADOLIBRE_REDIRECT_URI"));
  console.log(url.toString());
} else if (command === "exchange") {
  const code = process.argv[3] ?? required("MERCADOLIBRE_AUTH_CODE");
  await tokenRequest({
    grant_type: "authorization_code",
    client_id: required("MERCADOLIBRE_CLIENT_ID"),
    client_secret: required("MERCADOLIBRE_CLIENT_SECRET"),
    code,
    redirect_uri: required("MERCADOLIBRE_REDIRECT_URI")
  });
} else if (command === "refresh") {
  await tokenRequest({
    grant_type: "refresh_token",
    client_id: required("MERCADOLIBRE_CLIENT_ID"),
    client_secret: required("MERCADOLIBRE_CLIENT_SECRET"),
    refresh_token: required("MERCADOLIBRE_REFRESH_TOKEN")
  });
} else {
  console.error("use: npm run mercadolibre:auth-url | npm run mercadolibre:exchange -- CODE | npm run mercadolibre:refresh");
  process.exitCode = 1;
}

async function tokenRequest(body) {
  const res = await fetch("https://api.mercadolibre.com/oauth/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body)
  });
  const json = await res.json();
  if (!res.ok) {
    console.error(json);
    process.exit(1);
  }
  console.log(`MERCADOLIBRE_ACCESS_TOKEN=${json.access_token}`);
  if (json.refresh_token) console.log(`MERCADOLIBRE_REFRESH_TOKEN=${json.refresh_token}`);
  console.log(`EXPIRES_IN=${json.expires_in}`);
}

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}
