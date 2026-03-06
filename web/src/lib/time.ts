import { format } from 'date-fns';

type DateLike = Date | string | number | null | undefined;

const toDate = (value: DateLike): Date | null => {
	if (value === null || value === undefined) return null;
	const date = value instanceof Date ? value : new Date(value);
	if (Number.isNaN(date.getTime())) return null;
	return date;
};

export const formatInUserTimeZone = (
	value: DateLike,
	pattern: string = 'yyyy-MM-dd HH:mm',
): string => {
	const date = toDate(value);
	if (!date) return '';
	return format(date, pattern);
};

export const getUserTimeZone = (): string => {
	if (typeof Intl === 'undefined') return 'UTC';
	return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
};

export const getLocalDateYMD = (date: Date = new Date()): string => {
	return format(date, 'yyyy-MM-dd');
};

export const getUtcDateYMD = (date: Date = new Date()): string => {
	return date.toISOString().split('T')[0];
};

export const getTodayDateCandidates = (date: Date = new Date()): string[] => {
	const localDate = getLocalDateYMD(date);
	const utcDate = getUtcDateYMD(date);
	return localDate === utcDate ? [localDate] : [localDate, utcDate];
};
