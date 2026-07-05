import { LogoMark } from "@sluice/ui";

export default function Loading() {
  return (
    <div className="grid min-h-dvh place-items-center">
      <LogoMark className="h-8 animate-pulse text-low motion-reduce:animate-none" />
    </div>
  );
}
