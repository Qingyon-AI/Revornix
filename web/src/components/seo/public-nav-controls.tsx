'use client';

import { setUserLocale } from '@/i18n/locale';
import { Button } from '@/components/ui/button';
import { Languages, Moon, Sun } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { startTransition, useEffect, useState } from 'react';

const PublicNavControls = () => {
	const t = useTranslations();
	const locale = useLocale();
	const router = useRouter();
	const { resolvedTheme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);
	const [isSwitchingLanguage, setIsSwitchingLanguage] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	const handleThemeToggle = () => {
		if (!mounted) {
			return;
		}
		setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
	};

	const handleLanguageToggle = () => {
		const nextLocale = locale === 'zh' ? 'en' : 'zh';
		setIsSwitchingLanguage(true);
		startTransition(async () => {
			await setUserLocale(nextLocale);
			router.refresh();
			setIsSwitchingLanguage(false);
		});
	};

	return (
		<div className='flex items-center gap-1'>
			<Button
				type='button'
				variant='outline'
				size='icon-sm'
				onClick={handleThemeToggle}
				className='rounded-xl border-border/60 bg-background/72 shadow-none'
				aria-label={mounted && resolvedTheme === 'dark'
					? t('setting_color_light')
					: t('setting_color_dark')}>
				{mounted && resolvedTheme === 'dark' ? (
					<Sun className='size-4' />
				) : (
					<Moon className='size-4' />
				)}
			</Button>
			<Button
				type='button'
				variant='outline'
				size='sm'
				onClick={handleLanguageToggle}
				disabled={isSwitchingLanguage}
				className='gap-1.5 rounded-xl border-border/60 bg-background/72 px-2.5 text-xs shadow-none'>
				<Languages className='size-4' />
				<span>{locale === 'zh' ? '中' : 'EN'}</span>
			</Button>
		</div>
	);
};

export default PublicNavControls;
