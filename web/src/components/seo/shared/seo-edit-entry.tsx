'use client';

import Cookies from 'js-cookie';
import Link from 'next/link';
import { SquarePen } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import { UserDocumentAuthority } from '@/enums/document';
import { UserSectionAuthority } from '@/enums/section';
import { cn } from '@/lib/utils';
import { useUserContext } from '@/provider/user-provider';
import { getMineDocumentAuthority } from '@/service/document';
import { getMineUserRoleAndAuthority } from '@/service/section';

type SeoEditEntryProps =
	| {
			type: 'document';
			documentId: number;
			ownerId?: number | null;
			className?: string;
	  }
	| {
			type: 'section';
			sectionId: number;
			ownerId?: number | null;
			className?: string;
	  };

const actionButtonClassName =
	'h-10 w-10 justify-center gap-0 overflow-hidden rounded-full border border-border/60 bg-background/85 px-0 text-foreground shadow-none dark:shadow-sm transition-[width,background-color,color,border-color,gap] duration-300 ease-out hover:bg-accent hover:text-accent-foreground';

const actionLabelClassName =
	'ml-0 max-w-0 overflow-hidden whitespace-nowrap text-sm font-medium opacity-0 transition-[margin,max-width,opacity] duration-300';

const SeoEditEntry = (props: SeoEditEntryProps) => {
	const t = useTranslations();
	const { mainUserInfo } = useUserContext();
	const [mounted, setMounted] = useState(false);
	const hasAccessToken = mounted && Boolean(Cookies.get('access_token'));
	const isOwner = props.ownerId != null && props.ownerId === mainUserInfo?.id;
	const canCheckAuthority =
		mounted && Boolean(mainUserInfo?.id || hasAccessToken) && !isOwner;

	useEffect(() => {
		setMounted(true);
	}, []);

	const documentAuthorityQuery = useQuery({
		queryKey:
			props.type === 'document'
				? ['seoMineDocumentAuthority', props.documentId, mainUserInfo?.id]
				: ['seoMineDocumentAuthority', undefined, mainUserInfo?.id],
		queryFn: () =>
			props.type === 'document'
				? getMineDocumentAuthority({ document_id: props.documentId })
				: Promise.resolve(null),
		enabled:
			props.type === 'document' &&
			Boolean(props.documentId) &&
			canCheckAuthority,
		retry: false,
		refetchOnWindowFocus: false,
	});

	const sectionAuthorityQuery = useQuery({
		queryKey:
			props.type === 'section'
				? ['seoMineSectionRoleAndAuthority', props.sectionId, mainUserInfo?.id]
				: ['seoMineSectionRoleAndAuthority', undefined, mainUserInfo?.id],
		queryFn: () =>
			props.type === 'section'
				? getMineUserRoleAndAuthority({ section_id: props.sectionId })
				: Promise.resolve(null),
		enabled:
			props.type === 'section' &&
			Boolean(props.sectionId) &&
			canCheckAuthority,
		retry: false,
		refetchOnWindowFocus: false,
	});

	const canEdit =
		isOwner ||
		(props.type === 'document'
			? documentAuthorityQuery.data?.authority ===
					UserDocumentAuthority.FULL_ACCESS ||
				documentAuthorityQuery.data?.authority ===
					UserDocumentAuthority.READ_AND_WRITE
			: sectionAuthorityQuery.data?.authority ===
					UserSectionAuthority.FULL_ACCESS ||
				sectionAuthorityQuery.data?.authority ===
					UserSectionAuthority.READ_AND_WRITE);

	if (!mounted || !canEdit) {
		return null;
	}

	const href =
		props.type === 'document'
			? `/document/detail/${props.documentId}`
			: `/section/detail/${props.sectionId}`;

	return (
		<div className={cn('inline-flex w-full justify-center', props.className)}>
			<Button
				asChild
				variant='ghost'
				data-seo-action-button
				className={actionButtonClassName}
				title={t('edit')}>
				<Link href={href}>
					<SquarePen className='size-4 shrink-0' />
					<span data-seo-action-label className={actionLabelClassName}>
						{t('edit')}
					</span>
				</Link>
			</Button>
		</div>
	);
};

export default SeoEditEntry;
