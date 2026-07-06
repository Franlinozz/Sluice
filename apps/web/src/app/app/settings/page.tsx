"use client";

import { useTheme } from "next-themes";
import { useAccount } from "wagmi";
import { Check, Mail } from "lucide-react";
import {
  AddressChip,
  Button,
  Card,
  HelpTip,
  cn,
} from "@sluice/ui";
import { arcConfig, explorerAddressUrl } from "@sluice/chain";
import { PageHeader } from "@/components/shell/page-parts";
import { WalletButton } from "@/components/wallet/wallet-button";
import { ProfileCard } from "@/components/people/profile-card";

function SettingCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="max-w-md">
        <h3 className="text-sm font-medium text-hi">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-mid">{description}</p>
      </div>
      <div className="flex flex-shrink-0 items-center gap-2">{children}</div>
    </Card>
  );
}

export default function SettingsPage() {
  const { resolvedTheme, setTheme } = useTheme();
  const { address, isConnected } = useAccount();
  const isDark = resolvedTheme !== "light";

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Settings"
        title="Account"
        description="Wallet, appearance, and network. Working controls do something; anything not yet available is disabled with a stated reason — never a silent no-op."
      />

      <ProfileCard />

      <div className="flex flex-col gap-4">
        <SettingCard
          title="Wallet"
          description={
            isConnected
              ? "Connected. Your address and balances are read live from Arc."
              : "Connect a browser wallet, or email/social once a Reown Project ID is set."
          }
        >
          {isConnected && address ? (
            <AddressChip address={address} href={explorerAddressUrl(address)} chars={5} />
          ) : (
            <WalletButton />
          )}
        </SettingCard>

        <SettingCard title="Appearance" description="Graphite ships dark-first. Marble is an optional light theme.">
          <div className="inline-flex rounded-[10px] border border-hairline bg-surface-1 p-1">
            {(["dark", "light"] as const).map((t) => {
              const active = (t === "dark") === isDark;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTheme(t)}
                  className={cn(
                    "rounded-md px-3 py-1 text-sm capitalize transition-colors",
                    active ? "bg-surface-3 text-hi" : "text-mid hover:text-hi",
                  )}
                >
                  {t === "dark" ? "Graphite" : "Marble"}
                </button>
              );
            })}
          </div>
        </SettingCard>

        <SettingCard
          title="Network"
          description="Arc Testnet is primary. Settlement is network-agnostic — mainnet is a config switch, available later."
        >
          <div className="inline-flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-[10px] border border-edge bg-surface-2 px-3 py-1.5 text-sm text-hi">
              <Check className="size-3.5 text-settled" /> Arc Testnet
            </span>
            <HelpTip label="Arc mainnet — coming soon. Settlement is wired network-agnostically, so this is a config switch.">
              <span tabIndex={0}>
                <Button variant="outline" size="sm" disabled>
                  Arc Mainnet
                </Button>
              </span>
            </HelpTip>
          </div>
        </SettingCard>

        <SettingCard
          title="Email & profile"
          description="A Circle user-controlled (embedded) wallet via a Web2 email login — the consumer path."
        >
          <HelpTip label="Continue with email needs Circle API keys (CIRCLE_API_KEY / CIRCLE_APP_ID). Ships in a later phase.">
            <span tabIndex={0}>
              <Button variant="outline" size="sm" disabled>
                <Mail className="size-4" /> Continue with email
              </Button>
            </span>
          </HelpTip>
        </SettingCard>
      </div>

      <p className="text-xs text-low">
        Chain ID {arcConfig.chainId} · {arcConfig.explorerUrl.replace("https://", "")}
      </p>
    </div>
  );
}
