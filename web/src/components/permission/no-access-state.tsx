'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
	Lock,
	LogIn,
	MailQuestion,
	RotateCcw,
	SearchX,
	ShieldAlert,
} from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import {
	AccessRequestStatus,
	AccessRequestTargetType,
	cancelAccessRequest,
	createAccessRequest,
	getMyAccessRequest,
} from '@/service/access-request';
import { useUserContext } from '@/provider/user-provider';
import { cn } from '@/lib/utils';

type NoAccessStateProps = {
	targetType: AccessRequestTargetType;
	targetId: number;
	code?: number;
	message?: string;
	onRetry?: () => void;
	className?: string;
};

const NoAccessState = ({
	targetType,
	targetId,
	code,
	message,
	onRetry,
	className,
}: NoAccessStateProps) => {
	const t = useTranslations();
	const router = useRouter();
	const queryClient = useQueryClient();
	const { mainUserInfo } = useUserContext();
	const [isApplyDialogOpen, setIsApplyDialogOpen] = useState(false);
	const [applyMessage, setApplyMessage] = useState('');

	const isUnauthenticated = code === 401 || !mainUserInfo;
	const isForbidden = code === 403;
	const isNotFound = code === 404;
	const canApplyJoin = isForbidden && Boolean(mainUserInfo);

	const myRequestQueryKey = ['accessRequest.mine', targetType, targetId] as const;

	const { data: mineData, refetch: refetchMine } = useQuery({
		queryKey: myRequestQueryKey,
		queryFn: () => getMyAccessRequest({ target_type: targetType, target_id: targetId }),
		enabled: canApplyJoin,
	});

	const pendingRequest =
		mineData?.access_request &&
		mineData.access_request.status === AccessRequestStatus.PENDING
			? mineData.access_request
			: null;

	const createMutation = useMutation({
		mutationFn: () =>
			createAccessRequest({
				target_type: targetType,
				target_id: targetId,
				message: applyMessage.trim() || undefined,
			}),
		onSuccess: () => {
			toast.success(t('access_request_submit_success'));
			setIsApplyDialogOpen(false);
			setApplyMessage('');
			queryClient.invalidateQueries({ queryKey: myRequestQueryKey });
		},
		onError: (err: any) => {
			toast.error(err?.message ?? t('something_wrong'));
		},
	});

	const cancelMutation = useMutation({
		mutationFn: () =>
			cancelAccessRequest({ access_request_id: pendingRequest!.id }),
		onSuccess: () => {
			toast.success(t('access_request_cancel_success'));
			queryClient.invalidateQueries({ queryKey: myRequestQueryKey });
		},
		onError: (err: any) => {
			toast.error(err?.message ?? t('something_wrong'));
		},
	});

	useEffect(() => {
		if (!isApplyDialogOpen) {
			setApplyMessage('');
		}
	}, [isApplyDialogOpen]);

	const targetLabelKey =
		targetType === AccessRequestTargetType.SECTION
			? 'access_request_target_section'
			: 'access_request_target_document';

	const renderIcon = () => {
		if (isNotFound) return <SearchX className='size-10 text-muted-foreground' />;
		if (isUnauthenticated)
			return <LogIn className='size-10 text-muted-foreground' />;
		if (isForbidden) return <Lock className='size-10 text-muted-foreground' />;
		return <ShieldAlert className='size-10 text-muted-foreground' />;
	};

	const title = isNotFound
		? t('access_state_not_found_title')
		: isUnauthenticated
			? t('access_state_login_required_title')
			: isForbidden
				? t('access_state_forbidden_title', { target: t(targetLabelKey) })
				: t('access_state_unknown_title');

	const description = isNotFound
		? t('access_state_not_found_description', { target: t(targetLabelKey) })
		: isUnauthenticated
			? t('access_state_login_required_description', { target: t(targetLabelKey) })
			: isForbidden
				? t('access_state_forbidden_description', { target: t(targetLabelKey) })
				: message || t('access_state_unknown_description');

	return (
		<div
			className={cn(
				'flex h-[calc(100dvh-var(--private-top-header-height,3.5rem))] w-full items-center justify-center px-4 py-10 sm:px-6',
				className,
			)}>
			<div className='mx-auto flex w-full max-w-[640px] flex-col items-center gap-4 text-center'>
			<div className='flex size-20 items-center justify-center rounded-full border border-border/60 bg-background/40'>
				{renderIcon()}
			</div>
			<div className='space-y-2'>
				<h2 className='text-xl font-semibold text-foreground'>{title}</h2>
				<p className='text-sm leading-6 text-muted-foreground'>{description}</p>
				{message && !isForbidden && !isUnauthenticated && !isNotFound ? (
					<p className='text-xs text-muted-foreground/80'>{message}</p>
				) : null}
			</div>

			<div className='flex flex-wrap items-center justify-center gap-2 pt-2'>
				{isUnauthenticated ? (
					<Button onClick={() => router.push('/login')}>
						<LogIn className='size-4' />
						{t('access_state_action_login')}
					</Button>
				) : null}

				{canApplyJoin ? (
					pendingRequest ? (
						<>
							<Button variant='outline' disabled>
								<MailQuestion className='size-4' />
								{t('access_state_action_pending')}
							</Button>
							<Button
								variant='ghost'
								disabled={cancelMutation.isPending}
								onClick={() => cancelMutation.mutate()}>
								{t('access_state_action_cancel_request')}
							</Button>
						</>
					) : (
						<Button onClick={() => setIsApplyDialogOpen(true)}>
							<MailQuestion className='size-4' />
							{t('access_state_action_apply')}
						</Button>
					)
				) : null}

				{onRetry && !isUnauthenticated && !isForbidden ? (
					<Button variant='outline' onClick={onRetry}>
						<RotateCcw className='size-4' />
						{t('retry')}
					</Button>
				) : null}

				<Button variant='ghost' onClick={() => router.back()}>
					{t('access_state_action_back')}
				</Button>
			</div>
			</div>

			<Dialog open={isApplyDialogOpen} onOpenChange={setIsApplyDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{t('access_state_apply_dialog_title')}</DialogTitle>
						<DialogDescription>
							{t('access_state_apply_dialog_description', {
								target: t(targetLabelKey),
							})}
						</DialogDescription>
					</DialogHeader>
					<Textarea
						value={applyMessage}
						onChange={(event) => setApplyMessage(event.target.value)}
						placeholder={t('access_state_apply_dialog_placeholder')}
						maxLength={1000}
						className='min-h-[120px]'
					/>
					<DialogFooter>
						<Button
							variant='outline'
							onClick={() => setIsApplyDialogOpen(false)}
							disabled={createMutation.isPending}>
							{t('cancel')}
						</Button>
						<Button
							disabled={createMutation.isPending}
							onClick={() => createMutation.mutate()}>
							{t('access_state_apply_dialog_submit')}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
};

export default NoAccessState;
