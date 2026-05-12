import { Navbar } from 'nextra-theme-docs';
import { Head, Search } from 'nextra/components';
import { getPageMap } from 'nextra/page-map';
import 'nextra-theme-docs/style.css';
import './globals.css';
import Image from 'next/image';
import CustomFooter from '@/components/footer';
import { GoogleAnalytics } from '@next/third-parties/google';
import { ReactNode } from 'react';
import logo from '@/static/logo.png';
import logoDark from '@/static/logo.dark.png';
import discordLogo from '@/static/discord.svg';
import discordLogoDarkMode from '@/static/discord.dark.svg';
import { setRequestLocale } from 'next-intl/server';
import LanguageChange from '@/components/language-change';
import NextTopLoader from 'nextjs-toploader';
import { FixedNextraLayout } from '@/components/nextra-fixed-layout';

export const metadata = {
	description:
		'Revornix documentation for deploying, configuring, and extending the AI-native information workspace.',
	metadataBase: new URL('https://revornix.com'),
	keywords: [
		'Revornix',
		'AI information workspace',
		'document management',
		'knowledge graph',
		'self-hosted knowledge base',
		'Markdown',
	],
	applicationName: 'Revornix',
	appleWebApp: {
		title: 'Revornix',
	},
	title: {
		default: 'Revornix Docs',
		template: '%s | Revornix',
	},
	openGraph: {
		url: './',
		siteName: 'Revornix',
		locale: 'zh_CN',
		type: 'website',
		title: 'Revornix Docs',
		description:
			'Guides for Revornix documents, sections, AI engines, integrations, deployment, and public knowledge sharing.',
	},
	twitter: {
		card: 'summary_large_image',
		site: 'https://revornix.com',
		title: 'Revornix Docs',
		description:
			'Guides for deploying, configuring, and extending Revornix.',
	},
	alternates: {
		canonical: './',
		languages: {
			en: '/en',
			zh: '/zh',
		},
	},
};

const navbar = (
	<Navbar
		projectLink='https://github.com/Qingyon-AI/Revornix'
		chatIcon={
			<>
				<Image
					src={discordLogo}
					alt='discord'
					width={30}
					height={30}
					className='dark:hidden'
				/>
				<Image
					src={discordLogoDarkMode}
					alt='discord'
					width={30}
					height={30}
					className='hidden dark:block'
				/>
			</>
		}
		chatLink='https://discord.gg/3XZfz84aPN'
		logo={
			<div className='flex flex-row items-center gap-2'>
				<Image
					className='dark:hidden block'
					src={logo}
					alt='logo'
					width={20}
					height={20}
				/>
				<Image
					className='hidden dark:block'
					src={logoDark}
					alt='logo'
					width={20}
					height={20}
				/>
				<p className='font-bold'>Revornix</p>
			</div>
		}>
		<LanguageChange />
	</Navbar>
);

interface Props {
	children: ReactNode;
	params: Promise<{ lang: string }>;
}

export default async function RootLayout({ children, params }: Props) {
	const { lang } = await params;
	setRequestLocale(lang);
	const pageMap = await getPageMap(`/${lang}`);
	const searchPlaceholder = lang === 'zh' ? '搜索文档...' : 'Search docs...';
	return (
		<html
			// Required to be set
			dir='ltr'
			lang={lang}
			// Suggested by `next-themes` package https://github.com/pacocoursey/next-themes#with-app
			suppressHydrationWarning>
			<Head
				color={{
					hue: {
						dark: 204,
						light: 212,
					},
					saturation: 100,
					lightness: {
						light: 45,
						dark: 55,
					},
				}}>
				<meta name='viewport' content='width=device-width, initial-scale=1.0' />
			</Head>
			<body>
				<NextTopLoader />
				<GoogleAnalytics gaId='G-MMTX35WR5M' />
				<FixedNextraLayout
					navbar={navbar}
					search={<Search className='revornix-search' placeholder={searchPlaceholder} />}
					pageMap={pageMap}
					feedback={{ content: null }}
					editLink={null}
					footer={<CustomFooter />}
					docsRepositoryBase='https://github.com/Qingyon-AI/Revornix'>
					{children}
				</FixedNextraLayout>
			</body>
		</html>
	);
}
