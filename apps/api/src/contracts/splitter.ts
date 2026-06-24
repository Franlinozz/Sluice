/**
 * Deploy + drive RoyaltySplitter instances (one per multi-collaborator resource). Multi-collaborator
 * citation payments settle on-chain: transfer USDC to the splitter, then distribute() fans out by
 * share — real Arcscan txs (CLAUDE.md: real settlement, no fakes).
 */
import { erc20Abi, type Address, type Hex } from "viem";
import { arcConfig, getClient, getWalletClient } from "@sluice/chain";
import { royaltySplitterAbi, royaltySplitterBytecode } from "./royalty-splitter.ts";

function relayerKey(): Hex {
  const k = (process.env.SELLER_PRIVATE_KEY ??
    process.env.BUYER_PRIVATE_KEY ??
    process.env.ARC_WALLET_PRIVATE_KEY) as Hex | undefined;
  if (!k) throw new Error("no deployer/relayer private key configured");
  return k;
}

export interface SplitShare {
  label: string;
  wallet: Address;
  pct: number;
}

/** Deploy a RoyaltySplitter for a resource's collaborators. Returns the contract address. */
export async function deploySplitter(splits: SplitShare[]): Promise<Address> {
  const payees = splits.map((s) => s.wallet);
  const shares = splits.map((s) => BigInt(Math.max(1, Math.round(s.pct))));
  const wallet = getWalletClient(relayerKey());
  const account = wallet.account!;
  const hash = await wallet.deployContract({
    abi: royaltySplitterAbi,
    bytecode: royaltySplitterBytecode as Hex,
    args: [arcConfig.usdcToken, payees, shares],
    account,
    chain: wallet.chain,
  });
  const rcpt = await getClient().waitForTransactionReceipt({ hash });
  if (!rcpt.contractAddress) throw new Error("deploy produced no contract address");
  return rcpt.contractAddress;
}

export interface SplitResult {
  transferTx: string;
  distributeTx: string;
}

/** Pay a multi-collaborator citation on-chain: transfer to the splitter, then distribute. */
export async function splitPayment(
  splitter: Address,
  amountBase: bigint,
  payerKey: Hex,
): Promise<SplitResult> {
  const wallet = getWalletClient(payerKey);
  const account = wallet.account!;
  const transferTx = await wallet.writeContract({
    address: arcConfig.usdcToken,
    abi: erc20Abi,
    functionName: "transfer",
    args: [splitter, amountBase],
    account,
    chain: wallet.chain,
  });
  await getClient().waitForTransactionReceipt({ hash: transferTx });

  const distributeTx = await wallet.writeContract({
    address: splitter,
    abi: royaltySplitterAbi,
    functionName: "distribute",
    args: [],
    account,
    chain: wallet.chain,
  });
  await getClient().waitForTransactionReceipt({ hash: distributeTx });

  return { transferTx, distributeTx };
}
