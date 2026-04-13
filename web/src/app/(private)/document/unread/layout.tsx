import type { Metadata } from 'next';
import { buildNoIndexAppMetadata } from '@/lib/seo-metadata';

export const metadata: Metadata = buildNoIndexAppMetadata(
	'Unread Documents',
	'Catch up on documents you have not read yet in Revornix.',
);

export default function Layout({ children }: { children: React.ReactNode }) {
	return children;
}
