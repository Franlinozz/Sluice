export { cn } from "./cn.ts";

// primitives
export { Button, buttonVariants, type ButtonProps } from "./primitives/button.tsx";
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./primitives/card.tsx";
export { Separator, Horizon } from "./primitives/separator.tsx";
export { Badge, type BadgeProps } from "./primitives/badge.tsx";
export {
  Pill,
  StatusPill,
  type PillTone,
  type PillProps,
  type SettlementStatus,
} from "./primitives/pill.tsx";
export { AmountMono, type AmountMonoProps } from "./primitives/amount.tsx";
export { DataRow, type DataRowProps } from "./primitives/data-row.tsx";
export { Skeleton } from "./primitives/skeleton.tsx";
export {
  NetworkBadge,
  LiveDot,
  type LiveStatus,
  type NetworkBadgeProps,
} from "./primitives/network-badge.tsx";
export { AddressChip, type AddressChipProps } from "./primitives/address-chip.tsx";
export { Logo, LogoMark } from "./primitives/logo.tsx";
export { GLYPH_VIEWBOX, GLYPH_G } from "./primitives/logo-paths.ts";
export { Input, Label } from "./primitives/input.tsx";
export { Switch } from "./primitives/switch.tsx";

// interactive (radix)
export {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  HelpTip,
} from "./primitives/tooltip.tsx";
export { Tabs, TabsList, TabsTrigger, TabsContent } from "./primitives/tabs.tsx";
export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./primitives/dialog.tsx";

// composites
export { Sparkline, type SparklineProps } from "./primitives/sparkline.tsx";
export { Stepper, type StepItem } from "./primitives/stepper.tsx";
export { MeterCard, type MeterCardProps } from "./primitives/meter-card.tsx";
export { ReceiptCard, type ReceiptCardProps } from "./primitives/receipt-card.tsx";
export { BondCard, type BondStatus, type BondCardProps } from "./primitives/bond-card.tsx";
export { AgentTrace, type TraceKind, type TraceStep } from "./primitives/agent-trace.tsx";

// motion (Overhaul R2) — CSS/rAF primitives, transform+opacity only, reduced-motion safe
export { Reveal } from "./motion/reveal.tsx";
export { CountUp } from "./motion/count-up.tsx";
export { PulseDot } from "./motion/pulse-dot.tsx";
export { RowEnter } from "./motion/row-enter.tsx";
export { TickerDigits } from "./motion/ticker-digits.tsx";
