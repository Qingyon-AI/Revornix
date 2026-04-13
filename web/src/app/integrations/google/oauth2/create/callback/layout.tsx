import type { Metadata } from 'next';
import { buildNoIndexAppMetadata } from '@/lib/seo-metadata';

export const metadata: Metadata = buildNoIndexAppMetadata(
	'Google Sign-in Callback',
	'Processing your Google sign-in in Revornix.',
);

export default function Layout({ children }: { children: React.ReactNode }) {
	return children;
}
