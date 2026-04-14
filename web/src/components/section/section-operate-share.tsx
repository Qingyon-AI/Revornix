import { Button } from '../ui/button';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getSectionPublish, publishSection, republishSection } from '@/service/section';
import { Badge } from '../ui/badge';
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '../ui/dialog';
import { useTranslations } from 'next-intl';
import { CopyIcon, InfoIcon, RefreshCcwIcon, ShareIcon } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';
import SectionShare from './section-share';
import { cn } from '@/lib/utils';
import { getQueryClient } from '@/lib/get-query-client';
import { toast } from 'sonner';
import { getSiteOrigin } from '@/lib/seo-metadata';
import { useState } from 'react';

const SectionOperateShare = ({
	section_id,
	className,
	onTriggerClick,
	showPublishBadge = true,
	iconOnly = false,
	open,
	onOpenChange,
}: {
	section_id: number;
	className?: string;
	onTriggerClick?: () => void;
	showPublishBadge?: boolean;
	iconOnly?: boolean;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}) => {
	const t = useTranslations();
	const queryClient = getQueryClient();
	const [internalOpen, setInternalOpen] = useState(false);
	const dialogOpen = open ?? internalOpen;
	const setDialogOpen = onOpenChange ?? setInternalOpen;

	const { data: sectionPublish } = useQuery({
		queryKey: ['getSectionPublish', section_id],
		queryFn: async () => {
			return getSectionPublish({ section_id: section_id });
		},
	});
	const isPublished = Boolean(sectionPublish?.status);
	const publicSectionUrl =
		sectionPublish?.uuid ? `${getSiteOrigin()}/section/${sectionPublish.uuid}` : '';

	const mutatePublishSection = useMutation({
		mutationFn: (status: boolean) => publishSection({ section_id, status }),
		onSuccess(_, status) {
			toast.success(
				status
					? t('section_publish_status_on')
					: t('admin_sections_publish_private'),
			);
			queryClient.invalidateQueries({
				queryKey: ['getSectionPublish', section_id],
			});
		},
		onError(error) {
			console.error(error);
			toast.error(error.message);
		},
	});

	const mutateRepublishSection = useMutation({
		mutationFn: () => republishSection({ section_id }),
		onSuccess() {
			toast.success(t('section_publish_status_on'));
			queryClient.invalidateQueries({
				queryKey: ['getSectionPublish', section_id],
			});
		},
		onError(error) {
			console.error(error);
			toast.error(error.message);
		},
	});

	const handleCopyPublicLink = async () => {
		if (!isPublished || !publicSectionUrl) {
			return;
		}

		try {
			await navigator.clipboard.writeText(publicSectionUrl);
			toast.success(t('copied'));
		} catch (error) {
			console.error(error);
			toast.error(t('document_share_copy_failed'));
		}
	};

	return (
		<>
			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogTrigger asChild>
					<Button
						title={t('section_share')}
						className={cn('flex-1 w-full text-xs', className)}
						variant={'ghost'}
						onClick={onTriggerClick}>
						<ShareIcon />
						{iconOnly ? (
							<span className='sr-only'>{t('section_share')}</span>
						) : (
							t('section_share')
						)}
						{isPublished ? (
							<span className='relative flex size-2'>
								<span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75' />
								<span className='relative inline-flex size-2 rounded-full bg-amber-500' />
							</span>
						) : null}
						{showPublishBadge && isPublished && (
							<Badge className='bg-amber-600/10 dark:bg-amber-600/20 hover:bg-amber-600/10 text-amber-500 shadow-none rounded-full'>
								<span className='relative flex size-2'>
									<span className='absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75'></span>
									<span className='relative inline-flex size-2 rounded-full bg-amber-500'></span>
								</span>
								{t('section_publish_status_on')}
							</Badge>
						)}
					</Button>
				</DialogTrigger>
				<DialogContent className='flex max-h-[90vh] flex-col gap-0 overflow-hidden rounded-[28px] p-0 sm:max-w-3xl'>
					<DialogHeader className='sticky top-0 z-10 border-b border-border/60 bg-background px-6 pb-4 pt-6'>
						<DialogTitle>{t('section_share')}</DialogTitle>
					</DialogHeader>
					<div className='min-h-0 flex-1 overflow-y-auto px-6 py-5'>
						<div className='flex flex-col gap-5'>
							<Alert className='border-emerald-500/40 bg-emerald-600/10 text-emerald-600 dark:border-emerald-600/40 dark:bg-emerald-600/15 dark:text-emerald-400'>
								<InfoIcon />
								<AlertDescription>
									{t('section_share_description')}
								</AlertDescription>
							</Alert>

							<div className='rounded-[24px] border border-border/60 bg-background/45 p-4'>
								<div className='flex flex-wrap items-center justify-between gap-3'>
									<div className='space-y-1'>
										<p className='text-sm font-semibold text-foreground'>
											{t('section_publish')}
										</p>
										<p className='text-sm leading-6 text-muted-foreground'>
											{isPublished
												? t('section_publish_description')
												: t('admin_sections_publish_private')}
										</p>
									</div>
									<div className='flex flex-wrap gap-2'>
										<Button
											variant='outline'
											className='rounded-full'
											onClick={() =>
												mutatePublishSection.mutate(!isPublished)
											}
											disabled={mutatePublishSection.isPending}>
											{isPublished
												? t('document_publish_disable')
												: t('section_publish')}
										</Button>
										<Button
											variant='outline'
											className='rounded-full'
											onClick={handleCopyPublicLink}
											disabled={!isPublished || !publicSectionUrl}>
											<CopyIcon className='size-4' />
											{t('document_share_copy_link')}
										</Button>
										{isPublished ? (
											<Button
												variant='outline'
												className='rounded-full'
												onClick={() => mutateRepublishSection.mutate()}
												disabled={mutateRepublishSection.isPending}>
												<RefreshCcwIcon className='size-4' />
												{t('retry')}
											</Button>
										) : null}
									</div>
								</div>
								{isPublished && publicSectionUrl ? (
									<p className='mt-3 break-all rounded-2xl border border-border/60 bg-background/60 px-3 py-2 text-xs leading-5 text-muted-foreground'>
										{publicSectionUrl}
									</p>
								) : null}
							</div>

							<div className='rounded-[24px] border border-border/60 bg-background/45 p-4'>
								<div className='space-y-1'>
									<p className='text-sm font-semibold text-foreground'>
										{t('section_share')}
									</p>
									<p className='text-sm leading-6 text-muted-foreground'>
										{t('section_share_description')}
									</p>
								</div>

								<div className='mt-4'>
									<SectionShare section_id={section_id} />
								</div>
							</div>
						</div>
					</div>
					<DialogFooter className='sticky bottom-0 z-10 border-t border-border/60 bg-background px-6 py-4'>
						<DialogClose asChild>
							<Button variant='outline'>{t('cancel')}</Button>
						</DialogClose>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
};

export default SectionOperateShare;
