import type { LucideIcon } from "lucide-react";
import {
  Wallet,
  Landmark,
  Banknote,
  CreditCard,
  PiggyBank,
  Coins,
  Smartphone,
  TrendingUp,
  Briefcase,
  Building2,
  Gift,
  DollarSign,
  Bitcoin,
  HandCoins
} from "lucide-react";

// Curated, selectable wallet icons. The stored value is the string `name`;
// components resolve it back to a Lucide component via getWalletIcon().
export const WALLET_ICONS: { name: string; label: string; icon: LucideIcon }[] = [
  { name: "wallet", label: "Wallet", icon: Wallet },
  { name: "landmark", label: "Bank", icon: Landmark },
  { name: "banknote", label: "Cash", icon: Banknote },
  { name: "credit-card", label: "Card", icon: CreditCard },
  { name: "smartphone", label: "E-Wallet", icon: Smartphone },
  { name: "hand-coins", label: "E-Money", icon: HandCoins },
  { name: "trending-up", label: "Investment", icon: TrendingUp },
  { name: "piggy-bank", label: "Savings", icon: PiggyBank },
  { name: "coins", label: "Coins", icon: Coins },
  { name: "briefcase", label: "Business", icon: Briefcase },
  { name: "building-2", label: "Property", icon: Building2 },
  { name: "bitcoin", label: "Crypto", icon: Bitcoin },
  { name: "gift", label: "Gift", icon: Gift },
  { name: "dollar-sign", label: "Other", icon: DollarSign }
];

const ICON_MAP = new Map(WALLET_ICONS.map((entry) => [entry.name, entry.icon]));

export function getWalletIcon(name: string | null | undefined): LucideIcon {
  if (!name) return Wallet;
  return ICON_MAP.get(name) ?? Wallet;
}
