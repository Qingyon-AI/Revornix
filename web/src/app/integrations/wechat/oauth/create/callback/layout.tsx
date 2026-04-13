import type { Metadata } from 'next';
import { buildNoIndexAppMetadata } from '@/lib/seo-metadata';

export const metadata: Metadata = buildNoIndexAppMetadata(
	'WeChat Sign-in Callback',
	'Processing your WeChat sign-in in Revornix.',
);

export default function Layout({ children }: { children: React.ReactNode }) {
	return children;
}
