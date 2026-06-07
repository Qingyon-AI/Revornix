import type { Metadata } from 'next';
import { buildNoIndexAppMetadata } from '@/lib/seo-metadata';

export const metadata: Metadata = buildNoIndexAppMetadata(
	'File Migration',
	'Manage and migrate registered Revornix file resources across file systems.',
);

export default function Layout({ children }: { children: React.ReactNode }) {
	return children;
}
