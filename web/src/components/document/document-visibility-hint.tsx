'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getDocumentPublish } from '@/service/document';

const DocumentVisibilityHint = ({
	documentId,
	className,
}: {
	documentId: number;
	className?: string;
}) => {
	const t = useTranslations();
	const { data } = useQuery({
		queryKey: ['getDocumentPublish', documentId],
		queryFn: () => getDocumentPublish({ document_id: documentId }),
		staleTime: 60_000,
	});

	const isPublished = Boolean(data?.status);

	return (
		<Badge
			variant={isPublished ? 'secondary' : 'outline'}
			className={cn(
				'rounded-full px-2 py-0.5 text-[11px] font-medium shadow-none',
				isPublished
					? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
					: 'border-border/60 text-muted-foreground',
				className,
			)}>
			<span className='inline-flex items-center gap-1.5'>
				<span
					className={cn(
						'size-1.5 rounded-full',
						isPublished ? 'bg-emerald-500' : 'bg-muted-foreground/70',
					)}
				/>
				{isPublished
					? t('section_publish_status_on')
					: t('admin_sections_publish_private')}
			</span>
		</Badge>
	);
};

export default DocumentVisibilityHint;
