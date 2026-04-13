import './globals.css';
import 'react-photo-view/dist/react-photo-view.css';
import 'katex/dist/katex.min.css';
import type { Metadata } from 'next';
import JsonLd from '@/components/seo/json-ld';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/provider/theme-provider';
import { UserContextProvider } from '@/provider/user-provider';
import { GoogleAnalytics } from '@next/third-parties/google';
import ReactQueryProvider from '@/provider/react-query-privider';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale } from 'next-intl/server';
import { getMessages, getTranslations } from 'next-intl/server';
import { AudioPlayerProvider } from '@/provider/audio-player-provider';
import FloatingAudioPlayer from '@/components/ui/floating-audio-player';
import NextTopLoader from 'nextjs-toploader';
import {
	buildMetadata,
	createAbsoluteUrl,
	formatMetaTitle,
	getDefaultOgImage,
	getSiteOrigin,
	getSiteUrl,
	toMetaDescription,
} from '@/lib/seo-metadata';

export async function generateMetadata(): Promise<Metadata> {
	const t = await getTranslations();
	const siteName = t('website_title');
	const description = toMetaDescription(t('website_description'));

	return {
		...buildMetadata({
			title: formatMetaTitle(siteName, description),
			description,
			images: [getDefaultOgImage()],
			keywords: ['AI workspace', 'public knowledge hub'],
		}),
		metadataBase: getSiteUrl(),
		manifest: '/manifest.webmanifest',
	};
}

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export default async function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	const locale = await getLocale();
	const messages = await getMessages();
	const t = await getTranslations();
	const siteName = t('website_title');
	const description = toMetaDescription(t('website_description'));
	const siteOrigin = getSiteOrigin();
	const communityUrl = createAbsoluteUrl('/community');
	const organizationSchema = {
		'@context': 'https://schema.org',
		'@type': 'Organization',
		name: siteName,
		url: siteOrigin,
		description,
		image: getDefaultOgImage(),
	};
	const webSiteSchema = {
		'@context': 'https://schema.org',
		'@type': 'WebSite',
		name: siteName,
		url: siteOrigin,
		description,
		inLanguage: locale,
		potentialAction: {
			'@type': 'SearchAction',
			target: `${communityUrl}?q={search_term_string}`,
			'query-input': 'required name=search_term_string',
		},
	};
	return (
		<html lang={locale} suppressHydrationWarning>
			<body>
				<JsonLd data={[organizationSchema, webSiteSchema]} />
				<NextIntlClientProvider messages={messages}>
					<NextTopLoader />
					<ReactQueryProvider>
						<ThemeProvider
							attribute='class'
							defaultTheme='system'
							enableSystem
							disableTransitionOnChange>
							<UserContextProvider>
								<AudioPlayerProvider>
									{children}
									<FloatingAudioPlayer />
								</AudioPlayerProvider>
							</UserContextProvider>
						</ThemeProvider>
					</ReactQueryProvider>
					<Toaster position='top-right' richColors />
				</NextIntlClientProvider>
			</body>
			{GA_ID && <GoogleAnalytics gaId={GA_ID} />}
		</html>
	);
}
