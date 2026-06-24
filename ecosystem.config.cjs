/**
 * pm2 process config for the Sluice VPS services (api + agent).
 * Long-running/stateful services live on the VPS; the web deploys to Vercel.
 *
 *   pm2 start ecosystem.config.cjs        # start all
 *   pm2 restart sluice-api                 # restart one
 *   pm2 logs sluice-api                    # tail logs
 *   pm2 save                               # persist across reboots
 *
 * Env (wallet keys, RPC, settlement backend) is loaded from /root/Sluice/.env.local by each
 * app's own env loader. Default SETTLEMENT_BACKEND=gateway.
 */
module.exports = {
  apps: [
    {
      name: "sluice-api",
      cwd: __dirname + "/apps/api",
      script: "src/index.ts",
      interpreter: "node",
      interpreter_args: "--import tsx",
      autorestart: true,
      max_restarts: 20,
      env: { NODE_ENV: "production" },
    },
  ],
};
