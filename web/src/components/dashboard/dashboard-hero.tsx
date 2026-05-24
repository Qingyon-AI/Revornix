'use client';

import { format } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import { zhCN } from 'date-fns/locale/zh-CN';
import { useLocale, useTranslations } from 'next-intl';
import { Dog, PawPrint } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import RandomClassicalPoem from './random-classical-poem';
import { ALL_HOLIDAYS, getHoliday, type Holiday } from './holiday';
import { useUserContext } from '@/provider/user-provider';

const greetingKeyForHour = (hour: number): string => {
	if (hour < 5) return 'dashboard_greeting_night';
	if (hour < 9) return 'dashboard_greeting_morning';
	if (hour < 11) return 'dashboard_greeting_forenoon';
	if (hour < 13) return 'dashboard_greeting_noon';
	if (hour < 18) return 'dashboard_greeting_afternoon';
	if (hour < 23) return 'dashboard_greeting_evening';
	return 'dashboard_greeting_night';
};

const ANIMATION_BY_HOLIDAY: Record<string, 'fall' | 'rise' | 'pulse' | 'sway'> = {
	christmas: 'fall',
	new_year: 'rise',
	spring_festival: 'rise',
	lantern: 'rise',
	mid_autumn: 'pulse',
	valentines: 'pulse',
	qixi: 'pulse',
	halloween: 'sway',
};

// Deterministic pseudo-random so SSR/CSR match without useEffect.
const seeded = (i: number, salt: number) => {
	const x = Math.sin(i * 9301 + salt * 49297) * 233280;
	return x - Math.floor(x);
};

const HolidayParticles = ({ holiday }: { holiday: Holiday }) => {
	const { Icon, accent, id } = holiday;
	const motion = ANIMATION_BY_HOLIDAY[id] ?? 'sway';
	const count = motion === 'pulse' ? 4 : motion === 'sway' ? 5 : 8;

	return (
		<div className='pointer-events-none absolute inset-0 overflow-hidden'>
			{Array.from({ length: count }).map((_, i) => {
				const leftPct = seeded(i, 1) * 92 + 2;
				const topPct = motion === 'pulse' ? seeded(i, 2) * 70 + 10 : 0;
				const size = 12 + Math.floor(seeded(i, 3) * 14);
				const duration =
					motion === 'fall'
						? 7 + seeded(i, 4) * 5
						: motion === 'rise'
							? 6 + seeded(i, 4) * 4
							: motion === 'pulse'
								? 2 + seeded(i, 4) * 1.5
								: 3 + seeded(i, 4) * 2;
				const delay = seeded(i, 5) * duration;
				const animClass =
					motion === 'fall'
						? 'holiday-fall'
						: motion === 'rise'
							? 'holiday-rise'
							: motion === 'pulse'
								? 'holiday-pulse'
								: 'holiday-sway';

				return (
					<Icon
						key={i}
						className={`absolute ${animClass} ${accent.decor}`}
						style={{
							left: `${leftPct}%`,
							top: motion === 'rise' ? 'auto' : `${topPct}%`,
							bottom: motion === 'rise' ? '0' : undefined,
							width: size,
							height: size,
							animationDuration: `${duration}s`,
							animationDelay: `-${delay}s`,
						}}
					/>
				);
			})}
		</div>
	);
};

const PawDecor = () => (
	<>
		<PawPrint className='pointer-events-none absolute -left-2 top-2 size-6 -rotate-12 text-emerald-500/15' />
		<PawPrint className='pointer-events-none absolute left-8 bottom-1 size-4 rotate-12 text-emerald-500/15' />
		<PawPrint className='pointer-events-none absolute right-1/2 top-1 size-3 text-emerald-500/15' />
	</>
);

const DashboardHero = () => {
	const t = useTranslations();
	const locale = useLocale();
	const { mainUserInfo } = useUserContext();
	const searchParams = useSearchParams();
	const holidayOverride = searchParams?.get('holiday') ?? null;
	const [now, setNow] = useState<Date | null>(null);

	useEffect(() => {
		setNow(new Date());
		const timer = setInterval(() => setNow(new Date()), 1000);
		return () => clearInterval(timer);
	}, []);

	const dateLocale = locale === 'zh' ? zhCN : enUS;
	const dateText = now
		? locale === 'zh'
			? format(now, 'yyyy 年 M 月 d 日 EEEE', { locale: dateLocale })
			: format(now, 'EEEE, MMMM d, yyyy', { locale: dateLocale })
		: '';
	const timeText = now ? format(now, 'HH:mm:ss') : '--:--:--';
	const greeting = now ? t(greetingKeyForHour(now.getHours())) : '';
	const nickname = mainUserInfo?.nickname;
	const holiday = holidayOverride
		? (ALL_HOLIDAYS[holidayOverride] ?? null)
		: now
			? getHoliday(now)
			: null;

	const avatarAccent = holiday
		? `${holiday.accent.bg} ${holiday.accent.text}`
		: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300';
	const AvatarIcon = holiday ? holiday.Icon : Dog;

	return (
		<div className='relative w-full overflow-hidden'>
			{holiday ? <HolidayParticles holiday={holiday} /> : <PawDecor />}
			<div className='relative flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
				<div className='flex min-w-0 items-center gap-3'>
					<div
						className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${avatarAccent}`}>
						<AvatarIcon
							className={`size-7 ${holiday ? 'holiday-pulse' : ''}`}
							strokeWidth={1.6}
						/>
					</div>
					<div className='flex min-w-0 flex-col gap-1'>
						<div className='flex flex-wrap items-baseline gap-x-2'>
							<h1 className='text-lg font-semibold tracking-tight md:text-xl'>
								{greeting}
								{nickname ? `，${nickname}` : ''}
							</h1>
							{holiday && (
								<span
									className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${holiday.accent.bg} ${holiday.accent.text}`}>
									<holiday.Icon className='size-3' />
									{t(holiday.labelKey)}
								</span>
							)}
						</div>
						<p className='flex flex-wrap items-baseline gap-x-2 text-xs text-muted-foreground'>
							<span>
								{dateText && t('dashboard_hero_today', { date: dateText })}
							</span>
							<span className='font-mono tabular-nums'>{timeText}</span>
						</p>
					</div>
				</div>
				<div className='w-full md:max-w-md'>
					<RandomClassicalPoem />
				</div>
			</div>
		</div>
	);
};

export default DashboardHero;
