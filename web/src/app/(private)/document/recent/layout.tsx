import type { Metadata } from 'next';
import { buildNoIndexAppMetadata } from '@/lib/seo-metadata';

export const metadata: Metadata = buildNoIndexAppMetadata(
	'Recent Documents',
	'Review documents you recently opened in Revornix.',
);

export default function Layout({ children }: { children: React.ReactNode }) {
	return children;
}
