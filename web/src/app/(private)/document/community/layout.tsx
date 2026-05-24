import type { Metadata } from 'next';
import { buildNoIndexAppMetadata } from '@/lib/seo-metadata';

export const metadata: Metadata = buildNoIndexAppMetadata(
	'Community Documents',
	'Discover public community documents inside Revornix.',
);

export default function Layout({ children }: { children: React.ReactNode }) {
	return children;
}
