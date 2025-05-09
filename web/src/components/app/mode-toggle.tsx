'use client';

import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

export function ModeToggle() {
	const t = useTranslations();
	const { setTheme, theme } = useTheme();

	// 关键点：延迟渲染，直到客户端 mounted
	const [mounted, setMounted] = useState(false);

	useEffect(() => setMounted(true), []);

	const getTheme = (theme: string) => {
		if (theme === 'dark') {
			return t('setting_color_dark');
		}
		if (theme === 'light') {
			return t('setting_color_light');
		}
		return t('setting_color_system');
	};

	if (!mounted) return null; // SSR 时不渲染

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant='link' className='text-xs'>
						{getTheme(theme!)}
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align='end'>
					<DropdownMenuItem onClick={() => setTheme('light')}>
						{t('setting_color_light')}
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => setTheme('dark')}>
						{t('setting_color_dark')}
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => setTheme('system')}>
						{t('setting_color_system')}
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</>
	);
}
