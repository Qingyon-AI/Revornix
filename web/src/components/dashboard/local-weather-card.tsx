'use client';

import {
	Cloud,
	CloudFog,
	CloudLightning,
	CloudMoon,
	CloudRain,
	CloudSnow,
	CloudSun,
	MapPin,
	RefreshCcw,
	Sun,
	Wind,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface LocalWeather {
	location: string;
	temperature: number;
	apparentTemperature?: number;
	weatherCode: number;
	isDay: boolean;
	windSpeed?: number;
}

interface LocalWeatherCardProps {
	variant?: 'card' | 'nav';
	className?: string;
}

const getWeatherIcon = (weatherCode: number, isDay: boolean) => {
	if (weatherCode === 0) {
		return isDay ? Sun : CloudMoon;
	}
	if ([1, 2].includes(weatherCode)) {
		return isDay ? CloudSun : CloudMoon;
	}
	if (weatherCode === 3) {
		return Cloud;
	}
	if ([45, 48].includes(weatherCode)) {
		return CloudFog;
	}
	if (
		[51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(weatherCode)
	) {
		return CloudRain;
	}
	if ([71, 73, 75, 77, 85, 86].includes(weatherCode)) {
		return CloudSnow;
	}
	if ([95, 96, 99].includes(weatherCode)) {
		return CloudLightning;
	}
	return Cloud;
};

const getWeatherSummary = (
	weatherCode: number,
	t: ReturnType<typeof useTranslations>,
) => {
	if (weatherCode === 0) {
		return t('dashboard_weather_clear');
	}
	if ([1, 2].includes(weatherCode)) {
		return t('dashboard_weather_partly_cloudy');
	}
	if (weatherCode === 3) {
		return t('dashboard_weather_cloudy');
	}
	if ([45, 48].includes(weatherCode)) {
		return t('dashboard_weather_fog');
	}
	if ([51, 53, 55, 56, 57].includes(weatherCode)) {
		return t('dashboard_weather_drizzle');
	}
	if ([61, 63, 65, 66, 67, 80, 81, 82].includes(weatherCode)) {
		return t('dashboard_weather_rain');
	}
	if ([71, 73, 75, 77, 85, 86].includes(weatherCode)) {
		return t('dashboard_weather_snow');
	}
	if ([95, 96, 99].includes(weatherCode)) {
		return t('dashboard_weather_thunderstorm');
	}
	return t('dashboard_weather_unknown');
};

const LocalWeatherCard = ({
	variant = 'card',
	className,
}: LocalWeatherCardProps) => {
	const t = useTranslations();
	const locale = useLocale();
	const [weather, setWeather] = useState<LocalWeather | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [hasError, setHasError] = useState(false);

	const loadWeather = async () => {
		setIsLoading(true);
		setHasError(false);

		try {
			const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
			const query = new URLSearchParams({
				timezone,
				language: locale === 'zh' ? 'zh' : 'en',
				browserLanguage: navigator.language,
			});
			const response = await fetch(`/api/dashboard/weather?${query.toString()}`, {
				cache: 'no-store',
			});
			if (!response.ok) {
				throw new Error('weather_request_failed');
			}
			const nextWeather = (await response.json()) as LocalWeather;
			setWeather(nextWeather);
		} catch (error) {
			console.error(error);
			setHasError(true);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		void loadWeather();
	}, [locale]);

	const WeatherIcon = getWeatherIcon(
		weather?.weatherCode ?? 1,
		weather?.isDay ?? true,
	);
	const isNavVariant = variant === 'nav';
	const summaryText =
		isLoading
			? isNavVariant
				? '...'
				: t('dashboard_weather_loading')
			: hasError || !weather
				? isNavVariant
					? '--'
					: t('dashboard_weather_error')
				: `${getWeatherSummary(weather.weatherCode, t)} · ${Math.round(
						weather.temperature,
					)}°C`;

	return (
		<div
			className={cn(
				'flex items-center text-left backdrop-blur-sm',
				isNavVariant
					? 'max-w-[168px] gap-2 rounded-xl border border-border/60 bg-background/70 px-2 py-1 shadow-sm'
					: 'max-w-sm gap-3 rounded-xl border border-border/60 bg-card/80 px-3 py-2 shadow-sm',
				className,
			)}>
			<div
				className={cn(
					'flex shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-700 dark:text-sky-300',
					isNavVariant ? 'size-6.5' : 'size-8',
				)}>
				<WeatherIcon className={cn(isNavVariant ? 'size-3' : 'size-4')} />
			</div>
			<div className='min-w-0 flex-1'>
				<div
					className={cn(
						'flex items-center gap-1 text-muted-foreground',
						isNavVariant ? 'text-[9px]' : 'text-[11px]',
					)}>
					<MapPin className='size-3' />
					<span className='line-clamp-1'>
						{weather?.location || t('dashboard_weather_local')}
					</span>
				</div>
				<p
					className={cn(
						'mt-0.5 line-clamp-1 text-foreground/90',
						isNavVariant ? 'text-[11px] leading-4.5 font-medium' : 'text-sm leading-6',
					)}>
					{summaryText}
				</p>
				{!isNavVariant && !isLoading && !hasError && weather && (
					<div className='mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground'>
						{weather.apparentTemperature !== undefined && (
							<span>
								{t('dashboard_weather_feels_like', {
									temperature: Math.round(weather.apparentTemperature),
								})}
							</span>
						)}
						{weather.windSpeed !== undefined && (
							<span className='inline-flex items-center gap-1'>
								<Wind className='size-3' />
								{t('dashboard_weather_wind', {
									speed: Math.round(weather.windSpeed),
								})}
							</span>
						)}
					</div>
				)}
			</div>
			{isNavVariant ? null : (
				<Button
					type='button'
					size='icon'
					variant='ghost'
					className='size-8 shrink-0 self-center rounded-lg text-muted-foreground'
					title={t('refresh')}
					onClick={() => void loadWeather()}
					disabled={isLoading}>
					<RefreshCcw
						className={cn('size-3.5', isLoading && 'animate-spin')}
					/>
				</Button>
			)}
		</div>
	);
};

export default LocalWeatherCard;
