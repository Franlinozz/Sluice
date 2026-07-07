"use client";

import * as React from "react";
import { useAccount } from "wagmi";
import { toast } from "sonner";
import { Rss, Wallet } from "lucide-react";
import { Button, Card, Input, Label, cn } from "@sluice/ui";
import { ingestRssAction } from "@/lib/actions";
import { WalletButton } from "@/components/wallet/wallet-button";

function shortAddr(a: string) {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export function RssForm() {
  const { address, isConnected } = useAccount();
  const [pending, start] = React.useTransition();
  const formRef = React.useRef<HTMLFormElement>(null);
  return (
    <Card className="p-6">
      <div className="eyebrow mb-1">RSSHub / RSS connector</div>
      <p className="mb-4 text-sm text-mid">
        Paste an RSS or Atom feed URL (an RSSHub route or a native feed). Each item becomes a priced,
        citable resource — agents pay per citation to ground answers in it.
      </p>

      <div
        className={cn(
          "mb-4 flex flex-wrap items-center gap-2 rounded-[10px] border px-3 py-2 text-xs",
          isConnected ? "border-hairline bg-surface-1 text-mid" : "border-[var(--pending)]/30 bg-[var(--pending)]/10 text-hi",
        )}
      >
        <Wallet className="size-3.5 shrink-0 text-steel" />
        {isConnected && address ? (
          <span>
            Every ingested item earns to your wallet{" "}
            <span className="font-mono text-hi">{shortAddr(address)}</span>.
          </span>
        ) : (
          <span className="flex flex-wrap items-center gap-2">
            Connect so <span className="font-medium">you</span> earn from this feed.
            <WalletButton />
          </span>
        )}
      </div>

      <form
        ref={formRef}
        action={(fd) =>
          start(async () => {
            const res = await ingestRssAction({
              feedUrl: String(fd.get("feedUrl") ?? ""),
              price: String(fd.get("price") ?? "$0.000001"),
              limit: Number(fd.get("limit") ?? "6"),
              author: String(fd.get("author") ?? "") || undefined,
              payTo: address ?? undefined,
              profileId: localStorage.getItem("sluice-profile-id") ?? undefined,
            });
            if (res.ok) {
              toast.success(`Ingested ${res.data?.registered ?? 0} item(s)`, {
                description: res.data?.feed?.title,
              });
              formRef.current?.reset();
            } else {
              toast.error("Ingest failed", { description: res.error });
            }
          })
        }
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      >
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="feedUrl">Feed URL</Label>
          <Input id="feedUrl" name="feedUrl" required placeholder="https://hnrss.org/frontpage" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="price">Price / citation</Label>
          <Input id="price" name="price" defaultValue="$0.000001" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="limit">Max items</Label>
          <Input id="limit" name="limit" type="number" defaultValue="6" />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="author">Author label (optional)</Label>
          <Input id="author" name="author" placeholder="defaults to feed/item author" />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={pending}>
            <Rss className="size-4" />
            {pending ? "Ingesting…" : "Ingest feed"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
