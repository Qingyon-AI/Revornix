import type { Metadata } from 'next';
import { buildNoIndexAppMetadata } from '@/lib/seo-metadata';

export const metadata: Metadata = buildNoIndexAppMetadata(
	'Starred Documents',
	'Browse documents you starred in Revornix.',
);

export default function Layout({ children }: { children: React.ReactNode }) {
	return children;
}
