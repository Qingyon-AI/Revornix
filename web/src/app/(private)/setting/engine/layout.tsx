import type { Metadata } from 'next';
import { buildNoIndexAppMetadata } from '@/lib/seo-metadata';

export const metadata: Metadata = buildNoIndexAppMetadata(
	'Engine Settings',
	'Manage engines available to your Revornix workspace.',
);

export default function Layout({ children }: { children: React.ReactNode }) {
	return children;
}
