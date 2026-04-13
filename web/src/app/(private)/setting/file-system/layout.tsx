import type { Metadata } from 'next';
import { buildNoIndexAppMetadata } from '@/lib/seo-metadata';

export const metadata: Metadata = buildNoIndexAppMetadata(
	'File System Settings',
	'Manage file system connections and defaults in Revornix.',
);

export default function Layout({ children }: { children: React.ReactNode }) {
	return children;
}
