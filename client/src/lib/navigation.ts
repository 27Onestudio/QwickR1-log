import { BadgeCheck, ClipboardList, FileText, LogOut, Printer, QrCode, Settings, ShieldCheck, WalletCards } from "lucide-react";

export const primaryLinks = [
  { path: "/", key: "retrieveFile" as const, icon: QrCode },
  { path: "/jobs", key: "jobs" as const, icon: ClipboardList },
  { path: "/pricing", key: "pricing" as const, icon: WalletCards },
  { path: "/poster", key: "qrPoster" as const, icon: Printer },
];

export const profileLinks = [
  { path: "/settings", key: "settings" as const, icon: Settings },
  { path: "/about", key: "about" as const, icon: BadgeCheck },
  { path: "/terms", key: "terms" as const, icon: FileText },
  { path: "/privacy", key: "privacy" as const, icon: ShieldCheck },
];

export const profileAction = { key: "signOut" as const, icon: LogOut };
