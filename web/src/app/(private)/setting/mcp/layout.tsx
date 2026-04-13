import type { Metadata } from 'next';
import { buildNoIndexAppMetadata } from '@/lib/seo-metadata';

export const metadata: Metadata = buildNoIndexAppMetadata(
	'MCP Settings',
	'Manage MCP servers and related workspace configuration in Revornix.',
);

export default function Layout({ children }: { children: React.ReactNode }) {
	return children;
}
