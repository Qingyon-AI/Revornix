import type { Metadata } from 'next';
import { buildNoIndexAppMetadata } from '@/lib/seo-metadata';

export const metadata: Metadata = buildNoIndexAppMetadata(
	'GitHub Sign-in Callback',
	'Processing your GitHub sign-in in Revornix.',
);

export default function Layout({ children }: { children: React.ReactNode }) {
	return children;
}
