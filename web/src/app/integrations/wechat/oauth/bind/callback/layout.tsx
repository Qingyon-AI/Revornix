import type { Metadata } from 'next';
import { buildNoIndexAppMetadata } from '@/lib/seo-metadata';

export const metadata: Metadata = buildNoIndexAppMetadata(
	'WeChat Binding Callback',
	'Processing your WeChat account binding in Revornix.',
);

export default function Layout({ children }: { children: React.ReactNode }) {
	return children;
}
