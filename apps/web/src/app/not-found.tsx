import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button, LogoMark } from "@sluice/ui";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-6">
      <div className="flex max-w-md flex-col items-center text-center">
        <LogoMark className="h-10 text-low" />
        <p className="eyebrow mt-8">404</p>
        <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-hi">
          Nothing metered here.
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-mid">
          This page doesn&apos;t exist — no charge for the visit.
        </p>
        <Button asChild size="sm" variant="secondary" className="mt-6">
          <Link href="/">
            <ArrowLeft className="size-4" /> Back to Sluice
          </Link>
        </Button>
      </div>
    </div>
  );
}
