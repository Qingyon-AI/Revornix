import type { Metadata } from 'next';
import { buildNoIndexAppMetadata } from '@/lib/seo-metadata';

export const metadata: Metadata = buildNoIndexAppMetadata(
	'Model Settings',
	'Manage AI model providers and model configuration in Revornix.',
);

export default function Layout({ children }: { children: React.ReactNode }) {
	return children;
}
