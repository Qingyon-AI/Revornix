'use client';

import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';

const LanguageChange = () => {
	const locales = [
		{ code: 'zh', name: '简体中文' },
		{ code: 'en', name: 'English' },
	];

	const getLocale = () => {
		if (typeof window === 'undefined') {
			return 'en';
		}
		const href = window.location.href;
		const url = new URL(href);
		const pathname = url.pathname;
		const segments = pathname.split('/');
		const langSegment = segments[1]; // 获取第二个路径段
		return langSegment || 'en';
	};

	const setLocale = (locale: string) => {
		if (typeof window === 'undefined') {
			return;
		}
		const href = window.location.href;
		const url = new URL(href);
		const pathname = url.pathname;
		const segments = pathname.split('/');
		const langSegment = segments[1]; // 获取第二个路径段
		window.location.href = `/${locale}${pathname.replace(
			`/${langSegment}`,
			''
		)}`;
	};

	return (
		<Select
			value={getLocale()}
			onValueChange={(value) => {
				setLocale(value);
			}}>
			<SelectTrigger className='shadow-none'>
				<SelectValue />
			</SelectTrigger>
			<SelectContent>
				<SelectGroup>
					{locales.map((locale, index) => {
						return (
							<SelectItem key={index} value={locale.code}>
								{locale.name}
							</SelectItem>
						);
					})}
				</SelectGroup>
			</SelectContent>
		</Select>
	);
};

export default LanguageChange;
