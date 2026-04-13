import type { Metadata } from 'next';
import { buildNoIndexAppMetadata } from '@/lib/seo-metadata';

export const metadata: Metadata = buildNoIndexAppMetadata(
	'My Follows',
	'Review users you follow in Revornix.',
);

export default function Layout({ children }: { children: React.ReactNode }) {
	return children;
}
