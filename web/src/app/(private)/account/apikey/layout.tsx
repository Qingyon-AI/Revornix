import type { Metadata } from 'next';
import { buildNoIndexAppMetadata } from '@/lib/seo-metadata';

export const metadata: Metadata = buildNoIndexAppMetadata(
	'API Keys',
	'Create and manage API keys for your Revornix account.',
);

export default function Layout({ children }: { children: React.ReactNode }) {
	return children;
}
