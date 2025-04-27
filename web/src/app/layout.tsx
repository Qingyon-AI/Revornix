import './globals.css';
import 'react-photo-view/dist/react-photo-view.css';
import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/provider/theme-provider';
import { appName, appDescription } from '@/config/base';
import { UserContextProvider } from '@/provider/user-provider';
import { GoogleAnalytics } from '@next/third-parties/google';
import ReactQueryProvider from '@/provider/react-query-privider';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale } from 'next-intl/server';
import { getTranslations, getMessages } from 'next-intl/server';

export const metadata: Metadata = {
	title: appName,
	description: appDescription,
};

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const locale = await getLocale();
	const messages = await getMessages();
	return (
		<html lang={locale} suppressHydrationWarning>
			<body>
				<NextIntlClientProvider messages={messages}>
					<ReactQueryProvider>
						<ThemeProvider
							attribute='class'
							defaultTheme='system'
							enableSystem
							disableTransitionOnChange>
							<UserContextProvider>{children}</UserContextProvider>
						</ThemeProvider>
					</ReactQueryProvider>
					<Toaster position='top-right' richColors />
				</NextIntlClientProvider>
			</body>
			<GoogleAnalytics gaId='G-GQX7YQFD7T' />
		</html>
	);
}
