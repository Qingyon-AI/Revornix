import type { Metadata } from 'next';
import { buildNoIndexAppMetadata } from '@/lib/seo-metadata';

export const metadata: Metadata = buildNoIndexAppMetadata(
	'Knowledge Graph',
	'Explore your connected knowledge graph in Revornix.',
);

export default function Layout({ children }: { children: React.ReactNode }) {
	return children;
}
