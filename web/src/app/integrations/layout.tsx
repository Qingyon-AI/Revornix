import type { Metadata } from 'next';
import { NO_INDEX_METADATA } from '@/lib/seo-metadata';

export const metadata: Metadata = NO_INDEX_METADATA;

const IntegrationsLayout = ({ children }: { children: React.ReactNode }) => {
	return <>{children}</>;
};

export default IntegrationsLayout;
