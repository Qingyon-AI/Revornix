import type { Metadata } from 'next';
import { buildNoIndexAppMetadata } from '@/lib/seo-metadata';

export const metadata: Metadata = buildNoIndexAppMetadata(
	'Notification Templates',
	'Manage notification templates and template parameters in your Revornix workspace.',
);

export default function Layout({ children }: { children: React.ReactNode }) {
	return children;
}
