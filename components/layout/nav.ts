export type NavItem = {
  href: string;
  label: string;
  icon: string;
  title: string;
  subtitle: string;
  exact?: boolean;
};

export const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: "dashboard",
    title: "Dashboard",
    subtitle: "Portfolio overview",
    exact: true,
  },
  {
    href: "/comparison",
    label: "Comparison View",
    icon: "compare_arrows",
    title: "Theta Decay Comparison",
    subtitle: "Side-by-Side Analysis",
  },
  {
    href: "/put-call",
    label: "Put-Call Ratio",
    icon: "pie_chart",
    title: "Put-Call Ratio",
    subtitle: "Market sentiment breakdown",
  },
  {
    href: "/volatility",
    label: "Volatility Surface",
    icon: "trending_up",
    title: "Volatility Surface",
    subtitle: "Skew and term structure",
  },
  {
    href: "/scenarios",
    label: "Scenarios",
    icon: "query_stats",
    title: "Scenario Analysis",
    subtitle: "Stress test outcomes",
  },
  {
    href: "/investments",
    label: "Investments",
    icon: "account_balance_wallet",
    title: "Investments",
    subtitle: "Positions and targets",
  },
  {
    href: "/crypto",
    label: "Crypto",
    icon: "currency_bitcoin",
    title: "Crypto Portfolio",
    subtitle: "Digital asset tracking",
  },
];

export function getRouteMeta(pathname: string) {
  const match = navItems.find((item) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href)
  );

  return {
    title: match?.title ?? "Dashboard",
    subtitle: match?.subtitle ?? "",
  };
}