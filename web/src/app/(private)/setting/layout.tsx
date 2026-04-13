import type { Metadata } from 'next';
import { buildNoIndexAppMetadata } from '@/lib/seo-metadata';

export const metadata: Metadata = buildNoIndexAppMetadata(
	'Settings',
	'Configure your Revornix workspace, preferences, models, engines, and integrations.',
);

export default function Layout({ children }: { children: React.ReactNode }) {
	return children;
}
