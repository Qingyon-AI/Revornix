import type { Metadata } from 'next';
import { buildNoIndexAppMetadata } from '@/lib/seo-metadata';

export const metadata: Metadata = buildNoIndexAppMetadata(
	'Notification Tasks',
	'Manage notification automation tasks in your Revornix workspace.',
);

export default function Layout({ children }: { children: React.ReactNode }) {
	return children;
}
