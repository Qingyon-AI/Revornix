import {
	Cake,
	Candy,
	Flag,
	Flower,
	Flower2,
	Gift,
	Ghost,
	Heart,
	type LucideIcon,
	Moon,
	PartyPopper,
	Sparkles,
	Snowflake,
	TreePine,
} from 'lucide-react';

export interface Holiday {
	id: string;
	labelKey: string;
	Icon: LucideIcon;
	accent: {
		text: string;
		bg: string;
		decor: string;
	};
}

// Lunar / solar-term holidays vary year-to-year. Hardcode the next few years
// for the ones we want to celebrate; fall back gracefully when out of range.
const LUNAR_HOLIDAYS: Record<string, [string, string][]> = {
	spring_festival: [
		['2026-02-17', '2026-02-23'],
		['2027-02-06', '2027-02-12'],
		['2028-01-26', '2028-02-01'],
	],
	lantern: [
		['2026-03-03', '2026-03-03'],
		['2027-02-20', '2027-02-20'],
		['2028-02-09', '2028-02-09'],
	],
	dragon_boat: [
		['2026-06-19', '2026-06-19'],
		['2027-06-09', '2027-06-09'],
		['2028-05-28', '2028-05-28'],
	],
	qixi: [
		['2026-08-19', '2026-08-19'],
		['2027-08-08', '2027-08-08'],
		['2028-08-26', '2028-08-26'],
	],
	mid_autumn: [
		['2026-09-25', '2026-09-25'],
		['2027-09-15', '2027-09-15'],
		['2028-10-03', '2028-10-03'],
	],
	qingming: [
		['2026-04-05', '2026-04-05'],
		['2027-04-05', '2027-04-05'],
		['2028-04-04', '2028-04-04'],
	],
};

const fmt = (d: Date) =>
	`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const inLunarWindow = (id: string, today: string): boolean => {
	const windows = LUNAR_HOLIDAYS[id];
	if (!windows) return false;
	return windows.some(([s, e]) => today >= s && today <= e);
};

const ACCENTS = {
	red: {
		text: 'text-red-600 dark:text-red-300',
		bg: 'bg-red-500/10',
		decor: 'text-red-500/20',
	},
	pink: {
		text: 'text-pink-600 dark:text-pink-300',
		bg: 'bg-pink-500/10',
		decor: 'text-pink-500/20',
	},
	amber: {
		text: 'text-amber-600 dark:text-amber-300',
		bg: 'bg-amber-500/10',
		decor: 'text-amber-500/25',
	},
	orange: {
		text: 'text-orange-600 dark:text-orange-300',
		bg: 'bg-orange-500/10',
		decor: 'text-orange-500/25',
	},
	sky: {
		text: 'text-sky-600 dark:text-sky-300',
		bg: 'bg-sky-500/10',
		decor: 'text-sky-500/20',
	},
	emerald: {
		text: 'text-emerald-600 dark:text-emerald-300',
		bg: 'bg-emerald-500/10',
		decor: 'text-emerald-500/20',
	},
	violet: {
		text: 'text-violet-600 dark:text-violet-300',
		bg: 'bg-violet-500/10',
		decor: 'text-violet-500/20',
	},
};

export const ALL_HOLIDAYS: Record<string, Holiday> = {
	new_year: {
		id: 'new_year',
		labelKey: 'dashboard_holiday_new_year',
		Icon: PartyPopper,
		accent: ACCENTS.amber,
	},
	spring_festival: {
		id: 'spring_festival',
		labelKey: 'dashboard_holiday_spring_festival',
		Icon: PartyPopper,
		accent: ACCENTS.red,
	},
	lantern: {
		id: 'lantern',
		labelKey: 'dashboard_holiday_lantern',
		Icon: Moon,
		accent: ACCENTS.amber,
	},
	valentines: {
		id: 'valentines',
		labelKey: 'dashboard_holiday_valentines',
		Icon: Heart,
		accent: ACCENTS.pink,
	},
	womens_day: {
		id: 'womens_day',
		labelKey: 'dashboard_holiday_womens_day',
		Icon: Flower,
		accent: ACCENTS.pink,
	},
	qingming: {
		id: 'qingming',
		labelKey: 'dashboard_holiday_qingming',
		Icon: Flower2,
		accent: ACCENTS.emerald,
	},
	labor_day: {
		id: 'labor_day',
		labelKey: 'dashboard_holiday_labor_day',
		Icon: Sparkles,
		accent: ACCENTS.red,
	},
	youth_day: {
		id: 'youth_day',
		labelKey: 'dashboard_holiday_youth_day',
		Icon: Sparkles,
		accent: ACCENTS.sky,
	},
	childrens_day: {
		id: 'childrens_day',
		labelKey: 'dashboard_holiday_childrens_day',
		Icon: Candy,
		accent: ACCENTS.pink,
	},
	dragon_boat: {
		id: 'dragon_boat',
		labelKey: 'dashboard_holiday_dragon_boat',
		Icon: Sparkles,
		accent: ACCENTS.emerald,
	},
	qixi: {
		id: 'qixi',
		labelKey: 'dashboard_holiday_qixi',
		Icon: Heart,
		accent: ACCENTS.pink,
	},
	mid_autumn: {
		id: 'mid_autumn',
		labelKey: 'dashboard_holiday_mid_autumn',
		Icon: Cake,
		accent: ACCENTS.amber,
	},
	national_day: {
		id: 'national_day',
		labelKey: 'dashboard_holiday_national_day',
		Icon: Flag,
		accent: ACCENTS.red,
	},
	halloween: {
		id: 'halloween',
		labelKey: 'dashboard_holiday_halloween',
		Icon: Ghost,
		accent: ACCENTS.orange,
	},
	christmas: {
		id: 'christmas',
		labelKey: 'dashboard_holiday_christmas',
		Icon: TreePine,
		accent: ACCENTS.emerald,
	},
};

export const getHoliday = (date: Date): Holiday | null => {
	const month = date.getMonth() + 1;
	const day = date.getDate();
	const today = fmt(date);

	// Fixed Gregorian dates first
	if (month === 1 && day === 1)
		return {
			id: 'new_year',
			labelKey: 'dashboard_holiday_new_year',
			Icon: PartyPopper,
			accent: ACCENTS.amber,
		};
	if (month === 2 && day === 14)
		return {
			id: 'valentines',
			labelKey: 'dashboard_holiday_valentines',
			Icon: Heart,
			accent: ACCENTS.pink,
		};
	if (month === 3 && day === 8)
		return {
			id: 'womens_day',
			labelKey: 'dashboard_holiday_womens_day',
			Icon: Flower,
			accent: ACCENTS.pink,
		};
	if (month === 5 && day >= 1 && day <= 3)
		return {
			id: 'labor_day',
			labelKey: 'dashboard_holiday_labor_day',
			Icon: Sparkles,
			accent: ACCENTS.red,
		};
	if (month === 5 && day === 4)
		return {
			id: 'youth_day',
			labelKey: 'dashboard_holiday_youth_day',
			Icon: Sparkles,
			accent: ACCENTS.sky,
		};
	if (month === 6 && day === 1)
		return {
			id: 'childrens_day',
			labelKey: 'dashboard_holiday_childrens_day',
			Icon: Candy,
			accent: ACCENTS.pink,
		};
	if (month === 10 && day >= 1 && day <= 7)
		return {
			id: 'national_day',
			labelKey: 'dashboard_holiday_national_day',
			Icon: Flag,
			accent: ACCENTS.red,
		};
	if (month === 10 && day === 31)
		return {
			id: 'halloween',
			labelKey: 'dashboard_holiday_halloween',
			Icon: Ghost,
			accent: ACCENTS.orange,
		};
	if (month === 12 && day >= 24 && day <= 26)
		return {
			id: 'christmas',
			labelKey: 'dashboard_holiday_christmas',
			Icon: month === 12 && day === 24 ? Gift : TreePine,
			accent: ACCENTS.emerald,
		};
	if (month === 12 && day === 31)
		return {
			id: 'new_year',
			labelKey: 'dashboard_holiday_new_year',
			Icon: Snowflake,
			accent: ACCENTS.sky,
		};

	// Lunar / solar-term lookups
	if (inLunarWindow('spring_festival', today))
		return {
			id: 'spring_festival',
			labelKey: 'dashboard_holiday_spring_festival',
			Icon: PartyPopper,
			accent: ACCENTS.red,
		};
	if (inLunarWindow('lantern', today))
		return {
			id: 'lantern',
			labelKey: 'dashboard_holiday_lantern',
			Icon: Moon,
			accent: ACCENTS.amber,
		};
	if (inLunarWindow('qingming', today))
		return {
			id: 'qingming',
			labelKey: 'dashboard_holiday_qingming',
			Icon: Flower2,
			accent: ACCENTS.emerald,
		};
	if (inLunarWindow('dragon_boat', today))
		return {
			id: 'dragon_boat',
			labelKey: 'dashboard_holiday_dragon_boat',
			Icon: Sparkles,
			accent: ACCENTS.emerald,
		};
	if (inLunarWindow('qixi', today))
		return {
			id: 'qixi',
			labelKey: 'dashboard_holiday_qixi',
			Icon: Heart,
			accent: ACCENTS.pink,
		};
	if (inLunarWindow('mid_autumn', today))
		return {
			id: 'mid_autumn',
			labelKey: 'dashboard_holiday_mid_autumn',
			Icon: Cake,
			accent: ACCENTS.amber,
		};

	return null;
};
