import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
const addr = privateKeyToAccount(generatePrivateKey()).address;
const api = "http://localhost:3001";
const j = (r: Response) => r.json();

const profile = await fetch(`${api}/profiles/ensure`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ wallet: addr }) }).then(j);
console.log("profile:", profile.id, "wallet:", addr);

const st = await fetch(`${api}/faucet/status?profileId=${profile.id}&wallet=${addr}`).then(j);
console.log("status before:", JSON.stringify(st));

const claim = await fetch(`${api}/faucet/claim`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ profileId: profile.id, wallet: addr }) }).then(j);
console.log("claim:", JSON.stringify(claim));

const again = await fetch(`${api}/faucet/claim`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ profileId: profile.id, wallet: addr }) }).then(j);
console.log("second claim (must refuse):", JSON.stringify(again));

const st2 = await fetch(`${api}/faucet/status?profileId=${profile.id}&wallet=${addr}`).then(j);
console.log("status after:", JSON.stringify(st2));
