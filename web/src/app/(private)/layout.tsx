import type { Metadata } from 'next';
import PrivateLayoutShell from '@/components/app/private-layout-shell';
import { NO_INDEX_METADATA } from '@/lib/seo-metadata';

export const metadata: Metadata = NO_INDEX_METADATA;

export default function Layout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return <PrivateLayoutShell>{children}</PrivateLayoutShell>;
}
