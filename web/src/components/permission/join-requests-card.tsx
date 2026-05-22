'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Loader2, MailCheck, MailX, UsersRound } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
	AccessRequestInfo,
	AccessRequestStatus,
	AccessRequestTargetType,
	handleAccessRequest,
	listAccessRequests,
} from '@/service/access-request';
import { UserSectionAuthority } from '@/enums/section';
import { UserDocumentAuthority } from '@/enums/document';
import { cn } from '@/lib/utils';
import { formatInUserTimeZone } from '@/lib/time';

type Props = {
	targetType: AccessRequestTargetType;
	targetId: number;
	canManage: boolean;
	autoOpenRequestId?: number | null;
	onAutoOpenConsumed?: () => void;
};

const JoinRequestsCard = ({
	targetType,
	targetId,
	canManage,
	autoOpenRequestId,
	onAutoOpenConsumed,
}: Props) => {
	const t = useTranslations();
	const queryClient = useQueryClient();
	const [isListOpen, setIsListOpen] = useState(false);
	const [focusedRequestId, setFocusedRequestId] = useState<number | null>(null);
	const consumedAutoOpenRequestIdRef = useRef<number | null>(null);

	const pendingQueryKey = useMemo(
		() => ['accessRequest.target.pending', targetType, targetId] as const,
		[targetType, targetId],
	);
	const allQueryKey = useMemo(
		() => ['accessRequest.target.all', targetType, targetId] as const,
		[targetType, targetId],
	);

	const { data: pendingData } = useQuery({
		queryKey: pendingQueryKey,
		queryFn: () =>
			listAccessRequests({
				target_type: targetType,
				target_id: targetId,
				status: AccessRequestStatus.PENDING,
			}),
		enabled: canManage,
	});

	const { data: allData, isFetching: allFetching } = useQuery({
		queryKey: allQueryKey,
		queryFn: () =>
			listAccessRequests({ target_type: targetType, target_id: targetId }),
		enabled: canManage && isListOpen,
	});

	const pendingCount = pendingData?.data.length ?? 0;
	const visibleRequests = useMemo(() => {
		const requests = allData?.data ?? [];
		if (!focusedRequestId) return requests;
		return requests.filter((item) => item.id === focusedRequestId);
	}, [allData?.data, focusedRequestId]);

	const invalidate = () => {
		queryClient.invalidateQueries({ queryKey: pendingQueryKey });
		queryClient.invalidateQueries({ queryKey: allQueryKey });
	};

	useEffect(() => {
		if (
			!canManage ||
			!autoOpenRequestId ||
			consumedAutoOpenRequestIdRef.current === autoOpenRequestId
		) {
			return;
		}
		consumedAutoOpenRequestIdRef.current = autoOpenRequestId;
		setFocusedRequestId(autoOpenRequestId);
		setIsListOpen(true);
		onAutoOpenConsumed?.();
	}, [autoOpenRequestId, canManage, onAutoOpenConsumed]);

	if (!canManage) return null;

	return (
		<>
			<button
				type='button'
				onClick={() => setIsListOpen(true)}
				className={cn(
					'group flex w-full items-center gap-3 text-left transition-colors hover:text-foreground',
				)}>
				<div className='flex size-10 shrink-0 items-center justify-center text-muted-foreground transition-colors group-hover:text-foreground'>
					<UsersRound className='size-5' />
				</div>
				<div className='min-w-0 flex-1 space-y-1'>
					<p className='text-sm font-semibold text-foreground'>
						{t('join_requests_card_title')}
					</p>
					<p className='text-xs leading-5 text-muted-foreground'>
						{pendingCount > 0
							? t('join_requests_card_pending', { count: pendingCount })
							: t('join_requests_card_empty')}
					</p>
				</div>
				{pendingCount > 0 ? (
					<span className='inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background/60 px-2 text-xs font-semibold leading-none text-foreground shadow-[0_1px_0_rgba(255,255,255,0.04)]'>
						{pendingCount > 99 ? '99+' : pendingCount}
					</span>
				) : null}
			</button>

			<Dialog
				open={isListOpen}
				onOpenChange={(open) => {
					setIsListOpen(open);
					if (!open) {
						setFocusedRequestId(null);
					}
				}}>
				<DialogContent className='flex max-h-[90vh] flex-col gap-0 overflow-hidden rounded-[28px] p-0 sm:max-w-3xl'>
					<DialogHeader className='border-b border-border/60 px-6 pb-4 pt-6'>
						<DialogTitle>{t('join_requests_dialog_title')}</DialogTitle>
						<DialogDescription>
							{t('join_requests_dialog_description')}
						</DialogDescription>
					</DialogHeader>
					<div className='max-h-[60vh] overflow-y-auto px-6 py-4'>
						{allFetching && !allData ? (
							<div className='flex items-center justify-center py-10 text-sm text-muted-foreground'>
								<Loader2 className='mr-2 size-4 animate-spin' />
								{t('loading')}
							</div>
						) : visibleRequests.length === 0 ? (
							<div className='flex flex-col items-center gap-2 py-10 text-sm text-muted-foreground'>
								<MailCheck className='size-6' />
								<p>{t('join_requests_empty')}</p>
							</div>
						) : (
							<div className='space-y-3'>
								{visibleRequests.map((item) => (
									<JoinRequestRow
										key={item.id}
										item={item}
										targetType={targetType}
										onResolved={invalidate}
										focused={item.id === focusedRequestId}
									/>
								))}
							</div>
						)}
					</div>
					<DialogFooter className='border-t border-border/60 px-6 py-3'>
						<Button variant='outline' onClick={() => setIsListOpen(false)}>
							{t('close')}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
};

type JoinRequestRowProps = {
	item: AccessRequestInfo;
	targetType: AccessRequestTargetType;
	onResolved: () => void;
	focused?: boolean;
};

const JoinRequestRow = ({
	item,
	targetType,
	onResolved,
	focused = false,
}: JoinRequestRowProps) => {
	const t = useTranslations();
	const [authority, setAuthority] = useState<number>(
		targetType === AccessRequestTargetType.SECTION
			? UserSectionAuthority.READ_ONLY
			: UserDocumentAuthority.READ_ONLY,
	);
	const [handleMessage, setHandleMessage] = useState('');

	const handleMutation = useMutation({
		mutationFn: (params: { approve: boolean }) =>
			handleAccessRequest({
				access_request_id: item.id,
				approve: params.approve,
				authority: params.approve ? authority : undefined,
				handle_message: handleMessage.trim() || undefined,
			}),
		onSuccess: () => {
			toast.success(t('join_requests_handled'));
			setHandleMessage('');
			onResolved();
		},
		onError: (err: any) => toast.error(err?.message ?? t('something_wrong')),
	});

	const isPending = item.status === AccessRequestStatus.PENDING;
	const pendingAction =
		handleMutation.isPending && handleMutation.variables
			? handleMutation.variables.approve
				? 'approve'
				: 'reject'
			: null;

	const statusLabel = (() => {
		switch (item.status) {
			case AccessRequestStatus.PENDING:
				return t('join_requests_status_pending');
			case AccessRequestStatus.APPROVED:
				return t('join_requests_status_approved');
			case AccessRequestStatus.REJECTED:
				return t('join_requests_status_rejected');
			case AccessRequestStatus.CANCELLED:
				return t('join_requests_status_cancelled');
			default:
				return '';
		}
	})();

	const authorityOptions =
		targetType === AccessRequestTargetType.SECTION
			? [
					{ value: UserSectionAuthority.READ_ONLY, label: t('authority_read_only') },
					{
						value: UserSectionAuthority.READ_AND_WRITE,
						label: t('authority_read_and_write'),
					},
					{
						value: UserSectionAuthority.FULL_ACCESS,
						label: t('authority_full_access'),
					},
				]
			: [
					{ value: UserDocumentAuthority.READ_ONLY, label: t('authority_read_only') },
					{
						value: UserDocumentAuthority.READ_AND_WRITE,
						label: t('authority_read_and_write'),
					},
				];

	return (
		<div
			className={cn(
				'rounded-xl border border-border/50 p-4',
				focused && 'border-primary/60 bg-primary/5 ring-1 ring-primary/30',
			)}>
			<div className='space-y-1.5'>
				<div className='flex flex-wrap items-center gap-2'>
					<Avatar className='size-6'>
						<AvatarImage src={item.applicant.avatar} alt={item.applicant.nickname} />
						<AvatarFallback className='text-[10px]'>
							{item.applicant.nickname.slice(0, 1).toUpperCase()}
						</AvatarFallback>
					</Avatar>
					<p className='text-sm font-semibold text-foreground'>
						{item.applicant.nickname}
					</p>
					<span className='inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground'>
						{statusLabel}
					</span>
					<span className='text-xs text-muted-foreground/80'>
						{formatInUserTimeZone(item.create_time, 'yyyy-MM-dd HH:mm') ?? ''}
					</span>
				</div>
				{item.message ? (
					<p className='text-sm leading-6 text-muted-foreground'>
						{item.message}
					</p>
				) : null}
			</div>

			{isPending ? (
				<div className='mt-3 space-y-2 border-t border-border/40 pt-3'>
					<div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
						<span className='text-xs font-medium text-muted-foreground'>
							{t('join_requests_authority_label')}
						</span>
						<Select
							value={String(authority)}
							onValueChange={(v) => setAuthority(Number(v))}
							disabled={handleMutation.isPending}>
							<SelectTrigger className='h-9 min-w-32 rounded-lg border-border/70 bg-background/70 px-3 text-sm shadow-none sm:w-36'>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{authorityOptions.map((option) => (
									<SelectItem key={option.value} value={String(option.value)}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<div className='flex gap-2 sm:ml-auto'>
							<Button
								size='default'
								className='h-9 flex-1 rounded-lg px-3 text-sm sm:flex-none'
								onClick={() => handleMutation.mutate({ approve: true })}
								disabled={handleMutation.isPending}>
								{pendingAction === 'approve' ? (
									<Loader2 className='size-4 animate-spin' />
								) : (
									<Check className='size-4' />
								)}
								{t('join_requests_action_approve')}
							</Button>
							<Button
								size='default'
								variant='outline'
								className='h-9 flex-1 rounded-lg px-3 text-sm sm:flex-none'
								onClick={() => handleMutation.mutate({ approve: false })}
								disabled={handleMutation.isPending}>
								{pendingAction === 'reject' ? (
									<Loader2 className='size-4 animate-spin' />
								) : (
									<MailX className='size-4' />
								)}
								{t('join_requests_action_reject')}
							</Button>
						</div>
					</div>
					<Textarea
						value={handleMessage}
						onChange={(event) => setHandleMessage(event.target.value)}
						placeholder={t('join_requests_handle_message_placeholder')}
						maxLength={1000}
						disabled={handleMutation.isPending}
						className='min-h-9 resize-none rounded-lg border-border/50 bg-muted/20 py-2 text-sm shadow-none focus-visible:ring-1'
					/>
				</div>
			) : null}

			{!isPending && item.handle_message ? (
				<>
					<Separator className='bg-border/40' />
					<p className='text-xs text-muted-foreground'>{item.handle_message}</p>
				</>
			) : null}
		</div>
	);
};

export default JoinRequestsCard;
