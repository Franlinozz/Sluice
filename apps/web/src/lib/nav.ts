import {
  BookOpen,
  Bot,
  Coins,
  Compass,
  Cpu,
  HeartHandshake,
  Landmark,
  LayoutDashboard,
  Radio,
  ReceiptText,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  external?: boolean;
}

export const primaryNav: NavItem[] = [
  { label: "Overview", href: "/app", icon: LayoutDashboard },
  { label: "Earn", href: "/app/earn", icon: Coins },
  { label: "Spend", href: "/app/spend", icon: Bot },
  { label: "Streams", href: "/app/meter", icon: Radio },
  { label: "Discover", href: "/app/discover", icon: Compass },
  { label: "Agents", href: "/app/agents", icon: Cpu },
  { label: "Funding", href: "/app/funding", icon: HeartHandshake },
  { label: "Treasury", href: "/app/treasury", icon: Landmark },
  { label: "Settlements", href: "/app/settlements", icon: ReceiptText },
];

export const secondaryNav: NavItem[] = [
  { label: "Settings", href: "/app/settings", icon: Settings },
  { label: "Docs", href: "/docs", icon: BookOpen },
];

export const allNav = [...primaryNav, ...secondaryNav];

/** Active-state test that keeps Overview ("/app") from matching every nested route. */
export function isNavActive(href: string, pathname: string): boolean {
  if (href === "/app") return pathname === "/app";
  return pathname === href || pathname.startsWith(`${href}/`);
}
