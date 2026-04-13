import type { Metadata } from 'next';
import { buildNoIndexAppMetadata } from '@/lib/seo-metadata';

export const metadata: Metadata = buildNoIndexAppMetadata(
	'Community Sections',
	'Discover public community sections inside Revornix.',
);

export default function Layout({ children }: { children: React.ReactNode }) {
	return children;
}
