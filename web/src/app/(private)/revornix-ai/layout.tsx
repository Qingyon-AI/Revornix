import type { Metadata } from 'next';
import { buildNoIndexAppMetadata } from '@/lib/seo-metadata';

export const metadata: Metadata = buildNoIndexAppMetadata(
	'Revornix AI',
	'Chat with Revornix AI inside your workspace.',
);

export default function Layout({ children }: { children: React.ReactNode }) {
	return children;
}
