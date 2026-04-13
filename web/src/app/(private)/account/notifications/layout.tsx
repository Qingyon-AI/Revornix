import type { Metadata } from 'next';
import { buildNoIndexAppMetadata } from '@/lib/seo-metadata';

export const metadata: Metadata = buildNoIndexAppMetadata(
	'Notifications',
	'Review your notification inbox in Revornix.',
);

export default function Layout({ children }: { children: React.ReactNode }) {
	return children;
}
