export type NavItem = {
	href: string;
	label: string;
	icon: string;
	title: string;
	subtitle: string;
	exact?: boolean;
	badgeKey?: "projects" | "scenariosRunning";
	isNotReleased?: boolean;
	hideSectionBreadcrumb?: boolean;
};

export type NavSection = {
	id: "main" | "analysis" | "portfolios";
	label: string;
	collapsible?: boolean;
	items: NavItem[];
};

export const navSections: NavSection[] = [
		{
			id: "main",
			label: "Main",
			items: [
				{
					href: "/dashboard",
					label: "Dashboard",
					icon: "dashboard",
					title: "Dashboard",
					subtitle: "Portfolio overview",
					exact: true,
				},
				{
					href: "/projects",
					label: "Projects",
					icon: "folder",
					title: "Projects",
					subtitle: "ISIN lookup and tracking",
					badgeKey: "projects",
				},
			],
		},
	{
		id: "analysis",
		label: "Analysis",
		collapsible: true,
		items: [
			{
				href: "/put-call",
				label: "Put/Call Ratio",
				icon: "pie_chart",
				title: "Put/Call Ratio",
				subtitle: "Market sentiment breakdown",
				isNotReleased: true,
			},
			{
				href: "/scenarios",
				label: "Scenarios (Simulation)",
				icon: "query_stats",
				title: "Scenarios",
				subtitle: "Simulation outcomes",
				badgeKey: "scenariosRunning",
				isNotReleased: true,
			},
			{
				href: "/volatility",
				label: "Volatility Surface",
				icon: "trending_up",
				title: "Volatility Surface",
				subtitle: "Skew and term structure",
				isNotReleased: true,
			},
			{
				href: "/comparison",
				label: "Comparison View",
				icon: "compare_arrows",
				title: "Comparison View",
				subtitle: "Side-by-side analysis",
				isNotReleased: true,
			},
			{
				href: "/analysis/optionsschein-rechner",
				label: "Warrant Calculator",
				icon: "calculate",
				title: "Warrant Calculator",
				subtitle: "Model-based warrant calculator",
				isNotReleased: true,
			},
		],
	},
	{
		id: "portfolios",
		label: "Portfolios",
		collapsible: true,
		items: [
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
				isNotReleased: true,
			},
		],
	},
];

const settingsNavItem: NavItem = {
	href: "/settings",
	label: "Settings",
	icon: "settings",
	title: "Settings",
	subtitle: "User preferences",
	hideSectionBreadcrumb: true,
};

export const navItems = [...navSections.flatMap((section) => section.items), settingsNavItem];

export function getRouteMeta(pathname: string) {
	const match = navItems.find((item) =>
		item.exact ? pathname === item.href : pathname.startsWith(item.href)
	);
	const section =
		navSections.find((group) => group.items.some((item) => item.href === match?.href)) ??
		null;

	return {
		title: match?.title ?? "Dashboard",
		subtitle: match?.subtitle ?? "",
		sectionLabel: match?.hideSectionBreadcrumb ? "" : section?.label ?? "",
	};
}
