import { NextRequest, NextResponse } from 'next/server';

interface WeatherForecastResult {
	current?: {
		temperature_2m?: number;
		apparent_temperature?: number;
		weather_code?: number;
		is_day?: number;
		wind_speed_10m?: number;
	};
}

interface GeocodingResult {
	results?: Array<{
		name: string;
		admin1?: string;
		latitude: number;
		longitude: number;
	}>;
}

interface IpLocationResult {
	city?: string;
	region?: string;
	country?: string;
	latitude?: number;
	longitude?: number;
	error?: boolean;
	reason?: string;
}

const parseTimezoneCity = (timezone: string | null): string | null => {
	if (!timezone) {
		return null;
	}

	const parts = timezone.split('/');
	const city = parts[parts.length - 1];
	if (!city) {
		return null;
	}

	return city.replace(/_/g, ' ');
};

const parseCountryCode = (language: string | null): string | undefined => {
	if (!language) {
		return undefined;
	}

	const segments = language.split('-');
	for (let index = segments.length - 1; index >= 0; index -= 1) {
		const segment = segments[index];
		if (/^[a-zA-Z]{2}$/.test(segment)) {
			return segment.toUpperCase();
		}
	}

	return undefined;
};

const buildLocationLabel = (name?: string, admin1?: string): string => {
	if (!name) {
		return '';
	}
	if (admin1 && admin1 !== name) {
		return `${name} · ${admin1}`;
	}
	return name;
};

const isPublicIpCandidate = (value: string) => {
	const ip = value.trim();
	if (!ip) {
		return false;
	}

	const normalizedIp = ip.startsWith('::ffff:') ? ip.slice(7) : ip;
	if (
		normalizedIp === '::1' ||
		normalizedIp === '127.0.0.1' ||
		normalizedIp.startsWith('10.') ||
		normalizedIp.startsWith('192.168.') ||
		normalizedIp.startsWith('169.254.') ||
		normalizedIp.startsWith('172.16.') ||
		normalizedIp.startsWith('172.17.') ||
		normalizedIp.startsWith('172.18.') ||
		normalizedIp.startsWith('172.19.') ||
		normalizedIp.startsWith('172.2') ||
		normalizedIp.startsWith('172.30.') ||
		normalizedIp.startsWith('172.31.') ||
		normalizedIp.startsWith('fc') ||
		normalizedIp.startsWith('fd')
	) {
		return false;
	}

	return true;
};

const getClientIp = (request: NextRequest): string | null => {
	const directCandidates = [
		request.headers.get('cf-connecting-ip'),
		request.headers.get('x-real-ip'),
	];

	for (const candidate of directCandidates) {
		if (candidate && isPublicIpCandidate(candidate)) {
			return candidate.trim().replace('::ffff:', '');
		}
	}

	const forwardedFor = request.headers.get('x-forwarded-for');
	if (!forwardedFor) {
		return null;
	}

	const forwardedCandidates = forwardedFor.split(',');
	for (const candidate of forwardedCandidates) {
		if (isPublicIpCandidate(candidate)) {
			return candidate.trim().replace('::ffff:', '');
		}
	}

	return null;
};

const getWeatherForecast = async (latitude: number, longitude: number) => {
	const forecastUrl = new URL('https://api.open-meteo.com/v1/forecast');
	forecastUrl.searchParams.set('latitude', String(latitude));
	forecastUrl.searchParams.set('longitude', String(longitude));
	forecastUrl.searchParams.set(
		'current',
		[
			'temperature_2m',
			'apparent_temperature',
			'weather_code',
			'is_day',
			'wind_speed_10m',
		].join(','),
	);
	forecastUrl.searchParams.set('temperature_unit', 'celsius');
	forecastUrl.searchParams.set('wind_speed_unit', 'kmh');
	forecastUrl.searchParams.set('timezone', 'auto');

	const forecastResponse = await fetch(forecastUrl.toString(), {
		cache: 'no-store',
	});
	if (!forecastResponse.ok) {
		throw new Error('forecast_failed');
	}

	const forecastData =
		(await forecastResponse.json()) as WeatherForecastResult;
	if (
		forecastData.current?.temperature_2m === undefined ||
		forecastData.current.weather_code === undefined
	) {
		throw new Error('weather_unavailable');
	}

	return forecastData.current;
};

const resolveLocationByIp = async (request: NextRequest) => {
	const clientIp = getClientIp(request);
	if (!clientIp) {
		return null;
	}

	const ipLocationResponse = await fetch(`https://ipapi.co/${clientIp}/json/`, {
		cache: 'no-store',
	});
	if (!ipLocationResponse.ok) {
		throw new Error('ip_location_failed');
	}

	const ipLocationData =
		(await ipLocationResponse.json()) as IpLocationResult;
	if (
		ipLocationData.error ||
		ipLocationData.latitude === undefined ||
		ipLocationData.longitude === undefined
	) {
		throw new Error(ipLocationData.reason ?? 'ip_location_failed');
	}

	return {
		location: buildLocationLabel(ipLocationData.city, ipLocationData.region),
		latitude: ipLocationData.latitude,
		longitude: ipLocationData.longitude,
	};
};

export async function GET(request: NextRequest) {
	try {
		const timezone = request.nextUrl.searchParams.get('timezone');
		const language = request.nextUrl.searchParams.get('language') ?? 'en';
		const browserLanguage =
			request.nextUrl.searchParams.get('browserLanguage');
		const cityQuery = parseTimezoneCity(timezone);

		if (!cityQuery) {
			return NextResponse.json(
				{ message: 'timezone_unavailable' },
				{ status: 400 },
			);
		}

		let resolvedLocation = null;
		try {
			resolvedLocation = await resolveLocationByIp(request);
		} catch (error) {
			console.error(error);
		}

		if (!resolvedLocation) {
			const countryCode = parseCountryCode(browserLanguage);
			const buildGeocodingUrl = (nextCountryCode?: string) => {
				const geocodingUrl = new URL(
					'https://geocoding-api.open-meteo.com/v1/search',
				);
				geocodingUrl.searchParams.set('name', cityQuery);
				geocodingUrl.searchParams.set('count', '1');
				geocodingUrl.searchParams.set('language', language);
				geocodingUrl.searchParams.set('format', 'json');
				if (nextCountryCode) {
					geocodingUrl.searchParams.set('countryCode', nextCountryCode);
				}
				return geocodingUrl;
			};

			const requestGeocoding = async (nextCountryCode?: string) => {
				const geocodingResponse = await fetch(
					buildGeocodingUrl(nextCountryCode),
					{
						cache: 'no-store',
					},
				);
				if (!geocodingResponse.ok) {
					throw new Error('geocoding_failed');
				}

				return (await geocodingResponse.json()) as GeocodingResult;
			};

			let geocodingData = await requestGeocoding(countryCode);
			let targetLocation = geocodingData.results?.[0];
			if (!targetLocation && countryCode) {
				geocodingData = await requestGeocoding();
				targetLocation = geocodingData.results?.[0];
			}
			if (!targetLocation) {
				throw new Error('location_not_found');
			}

			resolvedLocation = {
				location: buildLocationLabel(targetLocation.name, targetLocation.admin1),
				latitude: targetLocation.latitude,
				longitude: targetLocation.longitude,
			};
		}

		const forecastData = await getWeatherForecast(
			resolvedLocation.latitude,
			resolvedLocation.longitude,
		);

		return NextResponse.json({
			location: resolvedLocation.location,
			temperature: forecastData.temperature_2m,
			apparentTemperature: forecastData.apparent_temperature,
			weatherCode: forecastData.weather_code,
			isDay: forecastData.is_day === 1,
			windSpeed: forecastData.wind_speed_10m,
		});
	} catch (error) {
		console.error(error);
		return NextResponse.json(
			{ message: 'weather_unavailable' },
			{ status: 502 },
		);
	}
}
