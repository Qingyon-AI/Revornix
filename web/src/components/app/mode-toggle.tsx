'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';

import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function ModeToggle() {
	const { setTheme, theme } = useTheme();

	const getTheme = (theme: string) => {
		if (theme === 'dark') {
			return '暗夜模式';
		}
		if (theme === 'light') {
			return '日间模式';
		}
		return '跟随系统';
	};

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant='link' className='text-xs'>{getTheme(theme!)}</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align='end'>
					<DropdownMenuItem onClick={() => setTheme('light')}>
						日间模式
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => setTheme('dark')}>
						暗夜模式
					</DropdownMenuItem>
					<DropdownMenuItem onClick={() => setTheme('system')}>
						跟随系统
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</>
	);
}
