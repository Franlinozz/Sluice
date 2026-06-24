/**
 * Drivers for the Phase 5 contracts (BondEscrow + ERC-8004 Identity/Reputation). Every call here is
 * a REAL Arc transaction (CLAUDE.md: no fakes). The bond is real USDC moved on-chain; a slash moves
 * the provider's staked capital to the harmed buyer. Reputation is read straight off-chain.
 *
 * Economic model for the testnet demo: the PROVIDER self-bonds (skin in the game). The provider
 * stakes USDC guaranteeing delivery; the arbiter (platform operator) releases it on success or
 * slashes it to the buyer on underdelivery. Two wallets we control: buyer (operator/arbiter, funded)
 * and seller (the provider). The provider is capitalized from the operator if its on-wallet USDC is
 * short — honest test positioning, all on-chain.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { keccak256, toHex, erc20Abi, parseEther, type Address, type Hex } from "viem";
import { arcConfig, getClient, getWalletClient, getNativeBalance, getUsdcBalance } from "@sluice/chain";
import { identityRegistryAbi } from "./identity-registry.ts";
import { reputationRegistryAbi } from "./reputation-registry.ts";
import { bondEscrowAbi } from "./bond-escrow.ts";

export interface DeployedContracts {
  chainId: number;
  explorer: string;
  deployer: Address;
  arbiter: Address;
  usdcToken: Address;
  deployedAt: string;
  identityRegistry: { address: Address; tx: Hex };
  reputationRegistry: { address: Address; tx: Hex };
  bondEscrow: { address: Address; tx: Hex };
}

let _deployed: DeployedContracts | undefined;
export function deployed(): DeployedContracts {
  if (_deployed) return _deployed;
  const path = join(dirname(fileURLToPath(import.meta.url)), "deployed.json");
  _deployed = JSON.parse(readFileSync(path, "utf8")) as DeployedContracts;
  return _deployed;
}

/** Are the Phase 5 contracts deployed/available? */
export function escrowReady(): boolean {
  try {
    return Boolean(deployed().bondEscrow.address);
  } catch {
    return false;
  }
}

function arbiterKey(): Hex {
  const k = (process.env.BUYER_PRIVATE_KEY ?? process.env.ARC_WALLET_PRIVATE_KEY) as Hex | undefined;
  if (!k) throw new Error("no arbiter/operator key");
  return k;
}
function providerKey(): Hex {
  const k = process.env.SELLER_PRIVATE_KEY as Hex | undefined;
  if (!k) throw new Error("no provider (seller) key");
  return k;
}

export function arbiterAddress(): Address {
  return getWalletClient(arbiterKey()).account!.address;
}
export function providerAddress(): Address {
  return getWalletClient(providerKey()).account!.address;
}

/** Deterministic bytes32 match id from a seed (resourceId + nonce). */
export function computeMatchId(seed: string): Hex {
  return keccak256(toHex(seed));
}

/** Ensure `addr` has enough on-wallet USDC + native gas to post a bond; top up from the operator. */
async function capitalize(addr: Address, needUsdcAtomic: bigint): Promise<void> {
  const op = getWalletClient(arbiterKey());
  const client = getClient();

  const gas = await getNativeBalance(addr);
  const gasFloor = parseEther("0.05");
  if (gas < gasFloor) {
    const hash = await op.sendTransaction({
      to: addr,
      value: gasFloor - gas,
      account: op.account!,
      chain: op.chain,
    } as never);
    await client.waitForTransactionReceipt({ hash });
  }

  const usdc = await getUsdcBalance(addr);
  if (usdc < needUsdcAtomic) {
    const top = needUsdcAtomic - usdc + 1_000n; // small buffer
    const hash = await op.writeContract({
      address: arcConfig.usdcToken,
      abi: erc20Abi,
      functionName: "transfer",
      args: [addr, top],
      account: op.account!,
      chain: op.chain,
    });
    await client.waitForTransactionReceipt({ hash });
  }
}

export interface PostBondResult {
  matchId: Hex;
  amount: bigint;
  approveTx?: Hex;
  postTx: Hex;
}

/**
 * Provider self-bonds for a match: capitalize if needed, approve the escrow, then postBond.
 * `amount` is atomic USDC (6dp). beneficiary is the harmed buyer (paid on slash).
 */
export async function postBond(params: {
  matchId: Hex;
  beneficiary: Address;
  amount: bigint;
}): Promise<PostBondResult> {
  const { matchId, beneficiary, amount } = params;
  const escrow = deployed().bondEscrow.address;
  const provider = getWalletClient(providerKey());
  const providerAddr = provider.account!.address;
  const client = getClient();

  await capitalize(providerAddr, amount);

  // Approve the escrow to pull the bond.
  const allowance = (await client.readContract({
    address: arcConfig.usdcToken,
    abi: erc20Abi,
    functionName: "allowance",
    args: [providerAddr, escrow],
  })) as bigint;
  let approveTx: Hex | undefined;
  if (allowance < amount) {
    approveTx = await provider.writeContract({
      address: arcConfig.usdcToken,
      abi: erc20Abi,
      functionName: "approve",
      args: [escrow, amount],
      account: provider.account!,
      chain: provider.chain,
    });
    await client.waitForTransactionReceipt({ hash: approveTx });
  }

  const postTx = await provider.writeContract({
    address: escrow,
    abi: bondEscrowAbi,
    functionName: "postBond",
    args: [matchId, providerAddr, beneficiary, amount],
    account: provider.account!,
    chain: provider.chain,
  });
  await client.waitForTransactionReceipt({ hash: postTx });

  return { matchId, amount, approveTx, postTx };
}

/** Arbiter resolves a match: release (back to provider) or slash (to beneficiary). Real tx. */
export async function resolveBond(params: {
  matchId: Hex;
  outcome: "release" | "slash";
  reason: string;
}): Promise<Hex> {
  const escrow = deployed().bondEscrow.address;
  const arbiter = getWalletClient(arbiterKey());
  const client = getClient();
  const hash = await arbiter.writeContract({
    address: escrow,
    abi: bondEscrowAbi,
    functionName: params.outcome === "slash" ? "slash" : "release",
    args: [params.matchId, params.reason],
    account: arbiter.account!,
    chain: arbiter.chain,
  });
  await client.waitForTransactionReceipt({ hash });
  return hash;
}

export interface ProviderReputation {
  provider: Address;
  bonded: bigint;
  active: bigint;
  slashed: bigint;
  released: bigint;
  matches: number;
  slashes: number;
  /** reliability in basis points (10000 = perfect); released / (released+slashed) by value. */
  reliabilityBps: number;
}

/** Read a provider's on-chain bond reputation. */
export async function getReputation(provider: Address): Promise<ProviderReputation> {
  const escrow = deployed().bondEscrow.address;
  const r = (await getClient().readContract({
    address: escrow,
    abi: bondEscrowAbi,
    functionName: "reputation",
    args: [provider],
  })) as readonly [bigint, bigint, bigint, bigint, bigint, bigint];
  const [bonded, active, slashed, released, matches, slashes] = r;
  const resolved = released + slashed;
  const reliabilityBps = resolved === 0n ? 10000 : Number((released * 10000n) / resolved);
  return {
    provider,
    bonded,
    active,
    slashed,
    released,
    matches: Number(matches),
    slashes: Number(slashes),
    reliabilityBps,
  };
}

export interface OnChainBond {
  broker: Address;
  provider: Address;
  beneficiary: Address;
  amount: bigint;
  status: number; // 0 None, 1 Active, 2 Released, 3 Slashed
  createdAt: number;
  resolvedAt: number;
  reason: string;
}

export async function getBondOnChain(matchId: Hex): Promise<OnChainBond> {
  const escrow = deployed().bondEscrow.address;
  const b = (await getClient().readContract({
    address: escrow,
    abi: bondEscrowAbi,
    functionName: "getBond",
    args: [matchId],
  })) as {
    broker: Address;
    provider: Address;
    beneficiary: Address;
    amount: bigint;
    status: number;
    createdAt: bigint;
    resolvedAt: bigint;
    reason: string;
  };
  return {
    broker: b.broker,
    provider: b.provider,
    beneficiary: b.beneficiary,
    amount: b.amount,
    status: Number(b.status),
    createdAt: Number(b.createdAt),
    resolvedAt: Number(b.resolvedAt),
    reason: b.reason,
  };
}

// ─── ERC-8004 Identity + Reputation ──────────────────────────────────────────

/** Ensure the provider has an ERC-8004 identity; returns its agentId (registers once). */
export async function ensureProviderIdentity(domain: string, metadataURI: string): Promise<bigint> {
  const reg = deployed().identityRegistry.address;
  const provider = getWalletClient(providerKey());
  const addr = provider.account!.address;
  const client = getClient();
  const existing = (await client.readContract({
    address: reg,
    abi: identityRegistryAbi,
    functionName: "agentIdOf",
    args: [addr],
  })) as bigint;
  if (existing > 0n) return existing;

  await capitalize(addr, 0n); // gas only
  const hash = await provider.writeContract({
    address: reg,
    abi: identityRegistryAbi,
    functionName: "register",
    args: [domain, metadataURI],
    account: provider.account!,
    chain: provider.chain,
  });
  await client.waitForTransactionReceipt({ hash });
  return (await client.readContract({
    address: reg,
    abi: identityRegistryAbi,
    functionName: "agentIdOf",
    args: [addr],
  })) as bigint;
}

/** Arbiter records ERC-8004 feedback (1..5) on an agent after a match resolves. Real tx. */
export async function giveFeedback(agentId: bigint, score: number, uri: string): Promise<Hex> {
  const reg = deployed().reputationRegistry.address;
  const arbiter = getWalletClient(arbiterKey());
  const client = getClient();
  const hash = await arbiter.writeContract({
    address: reg,
    abi: reputationRegistryAbi,
    functionName: "giveFeedback",
    args: [agentId, score, uri],
    account: arbiter.account!,
    chain: arbiter.chain,
  });
  await client.waitForTransactionReceipt({ hash });
  return hash;
}

export async function getFeedbackStats(agentId: bigint): Promise<{ averageX100: number; count: number }> {
  const reg = deployed().reputationRegistry.address;
  const client = getClient();
  const [avg, count] = (await Promise.all([
    client.readContract({ address: reg, abi: reputationRegistryAbi, functionName: "averageScoreX100", args: [agentId] }),
    client.readContract({ address: reg, abi: reputationRegistryAbi, functionName: "feedbackCount", args: [agentId] }),
  ])) as [bigint, bigint];
  return { averageX100: Number(avg), count: Number(count) };
}
