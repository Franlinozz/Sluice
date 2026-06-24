export {
  arcConfig,
  explorerTxUrl,
  explorerAddressUrl,
  type ArcConfig,
} from "./config.ts";
export { arcTestnet, supportedChains } from "./chain.ts";
export {
  createArcPublicClient,
  arcPublicClient,
  getClient,
  getWalletClient,
  getNativeBalance,
  getUsdcBalance,
  erc20Abi,
} from "./client.ts";

import { arcConfig as _arcConfig } from "./config.ts";
/** The Arc chain id (5042002). */
export const chainId = _arcConfig.chainId;
