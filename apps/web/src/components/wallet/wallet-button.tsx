"use client";

import * as React from "react";
import {
  useAccount,
  useConnect,
  useConnectors,
  useDisconnect,
  useSwitchChain,
} from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { useAppKit } from "@reown/appkit/react";
import { LogOut, Wallet } from "lucide-react";
import { arcConfig, explorerAddressUrl } from "@sluice/chain";
import { AddressChip, Button, HelpTip, Skeleton } from "@sluice/ui";
import { hasProjectId } from "@/lib/wagmi";

/** Top-level wallet control: connect when disconnected, chip when connected. */
export function WalletButton() {
  const { isConnected } = useAccount();
  if (isConnected) return hasProjectId ? <WalletChipAppKit /> : <WalletChipBasic />;
  return hasProjectId ? <ConnectAppKit /> : <ConnectInjected />;
}

// ── Connect (with projectId): the full Reown AppKit modal ─────────────────────
function ConnectAppKit() {
  const { open } = useAppKit();
  return (
    <Button size="sm" onClick={() => open()}>
      <Wallet className="size-4" />
      Connect
    </Button>
  );
}

// ── Connect (no projectId): injected only, with an honest, stated limitation ──
function ConnectInjected() {
  const connectors = useConnectors();
  const { connect, isPending } = useConnect();
  const injected = connectors.find((c) => c.type === "injected") ?? connectors[0];

  if (!injected) {
    return (
      <HelpTip label="No browser wallet detected. Install one (e.g. MetaMask), or set NEXT_PUBLIC_REOWN_PROJECT_ID to enable email & social login.">
        <span tabIndex={0}>
          <Button size="sm" disabled>
            <Wallet className="size-4" />
            Connect wallet
          </Button>
        </span>
      </HelpTip>
    );
  }

  return (
    <HelpTip label="Browser wallet works now. Email & social login need a Reown Project ID (set NEXT_PUBLIC_REOWN_PROJECT_ID).">
      <span tabIndex={0}>
        <Button size="sm" disabled={isPending} onClick={() => connect({ connector: injected })}>
          <Wallet className="size-4" />
          {isPending ? "Connecting…" : "Connect wallet"}
        </Button>
      </span>
    </HelpTip>
  );
}

// ── Shared connected-state hook + frame ──────────────────────────────────────
function useWalletView() {
  const { address, chainId } = useAccount();
  const { switchChain, isPending: switching } = useSwitchChain();
  // Balance comes from the SERVER-CACHED endpoint, not a direct chain read (hotfix 2026-07-18:
  // per-client 15s chain polling was part of tripping the RPC rate limit). useQuery dedupes
  // identical in-flight requests across every mounted consumer.
  const { data } = useQuery<{ wallet?: { formattedNative?: string } } | null>({
    queryKey: ["wallet-balance", address],
    enabled: Boolean(address),
    refetchInterval: 30_000,
    staleTime: 30_000,
    queryFn: () =>
      fetch(`/api/sluice/gateway/balance?address=${address}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
  });
  const wrongNetwork = chainId != null && chainId !== arcConfig.chainId;
  return {
    address,
    wrongNetwork,
    switching,
    switchToArc: () => switchChain({ chainId: arcConfig.chainId }),
    balanceLabel: data?.wallet?.formattedNative ? `${data.wallet.formattedNative} USDC` : null,
  };
}

function WalletChipFrame({
  address,
  balanceLabel,
  wrongNetwork,
  switching,
  switchToArc,
  trailing,
}: ReturnType<typeof useWalletView> & { trailing: React.ReactNode }) {
  if (!address) return null;
  if (wrongNetwork) {
    return (
      <Button size="sm" variant="danger" onClick={switchToArc} disabled={switching}>
        {switching ? "Switching…" : "Wrong network — Switch to Arc"}
      </Button>
    );
  }
  return (
    <div className="flex items-center gap-2 rounded-pill border border-edge bg-surface-2 py-1 pl-3 pr-1">
      <span className="hidden font-mono text-xs tabular-nums text-mid sm:inline">
        {balanceLabel ?? <Skeleton className="inline-block h-3 w-16" />}
      </span>
      <span className="hidden h-4 w-px bg-hairline sm:block" />
      <AddressChip address={address} href={explorerAddressUrl(address)} chars={4} />
      {trailing}
    </div>
  );
}

// ── Connected (with projectId): open the AppKit account view ──────────────────
function WalletChipAppKit() {
  const view = useWalletView();
  const { open } = useAppKit();
  return (
    <WalletChipFrame
      {...view}
      trailing={
        <Button
          variant="ghost"
          size="icon"
          aria-label="Account"
          className="size-7"
          onClick={() => open({ view: "Account" })}
        >
          <Wallet className="size-3.5" />
        </Button>
      }
    />
  );
}

// ── Connected (no projectId): inline disconnect ──────────────────────────────
function WalletChipBasic() {
  const view = useWalletView();
  const { disconnect } = useDisconnect();
  return (
    <WalletChipFrame
      {...view}
      trailing={
        <Button
          variant="ghost"
          size="icon"
          aria-label="Disconnect"
          className="size-7"
          onClick={() => disconnect()}
        >
          <LogOut className="size-3.5" />
        </Button>
      }
    />
  );
}
