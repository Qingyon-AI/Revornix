import type { Metadata } from 'next';
import { buildNoIndexAppMetadata } from '@/lib/seo-metadata';

export const metadata: Metadata = buildNoIndexAppMetadata(
	'Create Section',
	'Create a new section in Revornix.',
);

export default function Layout({ children }: { children: React.ReactNode }) {
	return children;
}
