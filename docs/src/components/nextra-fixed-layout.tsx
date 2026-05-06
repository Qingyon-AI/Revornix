import type { ReactNode } from 'react';
import { ThemeProvider } from 'next-themes';
import { SkipNavLink } from 'nextra/components';
import { LayoutPropsSchema } from '../../node_modules/nextra-theme-docs/dist/schemas.js';
import { MobileNav } from '../../node_modules/nextra-theme-docs/dist/components/sidebar.js';
import {
	ConfigProvider,
	ThemeConfigProvider,
} from '../../node_modules/nextra-theme-docs/dist/stores/index.js';

type FixedLayoutProps = {
	children: ReactNode;
} & Record<string, unknown>;

export function FixedNextraLayout(props: FixedLayoutProps) {
	const { data, error } = LayoutPropsSchema.safeParse(props);

	if (error) {
		throw error;
	}

	const { children, footer, navbar, pageMap, nextThemes, banner, ...rest } = data;

	return (
		<ThemeConfigProvider value={rest}>
			<ThemeProvider {...nextThemes}>
				<SkipNavLink />
				{banner}
				<ConfigProvider pageMap={pageMap} navbar={navbar} footer={footer}>
					<MobileNav />
					{children}
				</ConfigProvider>
			</ThemeProvider>
		</ThemeConfigProvider>
	);
}
