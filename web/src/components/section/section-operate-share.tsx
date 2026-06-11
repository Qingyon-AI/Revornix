import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
	getSectionPublish,
	publishSection,
	republishSection,
	updateSectionPublishAccessKey,
} from '@/service/section';
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
import { useEffect, useState } from 'react';

const SectionOperateShare = ({
	section_id,
	className,
	onTriggerClick,
	showPublishBadge = true,
	iconOnly = false,
	open,
	onOpenChange,
	canPublish = true,
	canInviteMembers = true,
	canManageAllMembers = true,
	currentUserId,
}: {
	section_id: number;
	className?: string;
	onTriggerClick?: () => void;
	showPublishBadge?: boolean;
	iconOnly?: boolean;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	canPublish?: boolean;
	canInviteMembers?: boolean;
	canManageAllMembers?: boolean;
	currentUserId?: number;
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
		enabled: canPublish,
	});
	const isPublished = Boolean(sectionPublish?.status);
	const currentAccessKey = sectionPublish?.access_key ?? null;
	// Keyed links unlock directly without prompting visitors for the key;
	// the checkbox lets the sharer choose which flavour gets copied.
	const [includeKeyInLink, setIncludeKeyInLink] = useState(true);
	const publicSectionUrl = sectionPublish?.uuid
		? currentAccessKey && includeKeyInLink
			? `${getSiteOrigin()}/section/${sectionPublish.uuid}?key=${encodeURIComponent(currentAccessKey)}`
			: `${getSiteOrigin()}/section/${sectionPublish.uuid}`
		: '';

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

	const [accessKeyDraft, setAccessKeyDraft] = useState('');
	// Show the current key directly in the input so the creator can read,
	// tweak or clear it in place.
	useEffect(() => {
		setAccessKeyDraft(sectionPublish?.access_key ?? '');
	}, [sectionPublish?.access_key]);
	const mutateAccessKey = useMutation({
		mutationFn: (accessKey: string | null) =>
			updateSectionPublishAccessKey({
				section_id,
				access_key: accessKey,
			}),
		onSuccess(_, accessKey) {
			toast.success(
				accessKey ? t('access_key_updated') : t('access_key_cleared'),
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

							{canPublish ? (
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
								{isPublished ? (
									<div className='mt-3 space-y-2'>
										<div className='flex flex-wrap items-center justify-between gap-2'>
											<p className='text-sm font-semibold text-foreground'>
												{t('access_key_label')}
											</p>
											{currentAccessKey ? (
												<label
													className='flex cursor-pointer items-center gap-2 text-xs text-muted-foreground'
													title={t('access_key_include_in_link_hint')}>
													<Checkbox
														checked={includeKeyInLink}
														onCheckedChange={(checked) =>
															setIncludeKeyInLink(checked === true)
														}
													/>
													{t('access_key_include_in_link')}
												</label>
											) : null}
										</div>
										<div className='flex flex-wrap items-center gap-2'>
											<Input
												className='min-w-40 flex-1 font-mono'
												placeholder={t('access_key_placeholder')}
												value={accessKeyDraft}
												onChange={(e) => setAccessKeyDraft(e.target.value)}
											/>
											<Button
												variant='outline'
												className='rounded-full'
												disabled={
													!accessKeyDraft.trim() ||
													accessKeyDraft.trim() === currentAccessKey ||
													mutateAccessKey.isPending
												}
												onClick={() =>
													mutateAccessKey.mutate(accessKeyDraft.trim())
												}>
												{t('access_key_set')}
											</Button>
											{sectionPublish?.has_access_key ? (
												<Button
													variant='outline'
													className='rounded-full'
													disabled={mutateAccessKey.isPending}
													onClick={() => mutateAccessKey.mutate(null)}>
													{t('access_key_clear')}
												</Button>
											) : null}
										</div>
									</div>
								) : null}
							</div>
							) : null}

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
									<SectionShare
										section_id={section_id}
										canInviteMembers={canInviteMembers}
										canManageAllMembers={canManageAllMembers}
										currentUserId={currentUserId}
									/>
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
