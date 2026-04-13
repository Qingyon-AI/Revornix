import type { Metadata } from 'next';
import { buildNoIndexAppMetadata } from '@/lib/seo-metadata';

export const metadata: Metadata = buildNoIndexAppMetadata(
	'PayPal Payment Result',
	'Review the PayPal payment result in Revornix.',
);

export default function Layout({ children }: { children: React.ReactNode }) {
	return children;
}
