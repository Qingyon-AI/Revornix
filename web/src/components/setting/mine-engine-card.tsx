import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Button } from '../ui/button';
import { useMutation } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/get-query-client';
import { deleteEngine, forkEngine } from '@/service/engine';
import { toast } from 'sonner';
import {
	AudioLinesIcon,
	BanIcon,
	Globe2Icon,
	ImageIcon,
	Loader2,
	MicIcon,
	TextIcon,
	XCircleIcon,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '../ui/alert-dialog';
import { useMemo, useState } from 'react';
import { useUserContext } from '@/provider/user-provider';

import { EngineCategory, getEngineCategoryLabel } from '@/enums/engine';
import {
	EngineBillingMode,
	isEngineBillingMode,
} from '@/enums/engine-billing';
import { Badge } from '../ui/badge';
import EngineUpdate from './engine-update';
import SubscriptionPlanBadgeContent from './subscription-plan-badge-content';
import { EngineInfo } from '@/generated';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useRouter } from 'nextjs-toploader/app';
import { replacePath } from '@/lib/utils';
import { formatInUserTimeZone } from '@/lib/time';
import {
	getSubscriptionLockReasonTranslationKey,
	isSubscriptionLocked,
	shouldShowPlanLevelIndicator,
} from '@/lib/subscription';

const MineEngineCard = ({ engine_info }: { engine_info: EngineInfo }) => {
	const locale = useLocale();
	const t = useTranslations();
	const router = useRouter();
	const { refreshMainUserInfo, mainUserInfo, paySystemUserInfo } =
		useUserContext();
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

	const queryClient = getQueryClient();

	const mutateDeleteEngine = useMutation({
		mutationFn: deleteEngine,
		onSuccess: () => {
			toast.success(t('setting_engine_delete_success'));
			queryClient.invalidateQueries({
				predicate(query) {
					return query.queryKey.includes('searchCommunityEngines');
				},
			});
			refreshMainUserInfo();
		},
		onError: (error) => {
			toast.error(error.message);
		},
	});

	const mutateForkEngine = useMutation({
		mutationFn: forkEngine,
		onSuccess: () => {
			queryClient.invalidateQueries({
				predicate(query) {
					return (
						query.queryKey.includes('searchCommunityEngines') ||
						query.queryKey.includes('searchMyEngine')
					);
				},
			});
			refreshMainUserInfo();
		},
		onError(error, variables, onMutateResult, context) {
			console.error(error);
			toast.error(error.message);
		},
	});

	const isMineEngine = useMemo(() => {
		return mainUserInfo && mainUserInfo.id === engine_info?.creator.id;
	}, [engine_info?.creator.id, mainUserInfo]);
	const subscriptionLocked = useMemo(
		() =>
			isSubscriptionLocked(
				engine_info.required_plan_level,
				paySystemUserInfo,
				mainUserInfo,
			),
		[engine_info.required_plan_level, mainUserInfo, paySystemUserInfo],
	);
	const subscriptionLockedReasonKey = useMemo(
		() =>
			getSubscriptionLockReasonTranslationKey(
				paySystemUserInfo,
				engine_info.required_plan_level,
			),
		[engine_info.required_plan_level, paySystemUserInfo],
	);
	const billingMode = isEngineBillingMode(engine_info.billing_mode ?? 0)
		? (engine_info.billing_mode as EngineBillingMode)
		: EngineBillingMode.TOKEN;

	return (
		<>
			<Card className='bg-muted/50 h-full'>
				<CardHeader className='flex-1 flex flex-col'>
					<CardTitle className='flex flex-row items-center w-full min-w-0'>
						<div className='flex flex-row items-center gap-2 flex-1 min-w-0 flex-wrap break-all'>
							<span className='line-clamp-2'>{engine_info.name}</span>
						</div>
						<AlertDialog
							open={deleteDialogOpen}
							onOpenChange={setDeleteDialogOpen}>
							<AlertDialogTrigger asChild>
								<Button
									size={'icon'}
									type='button'
									variant={'ghost'}
									className='ml-auto'>
									<XCircleIcon className='size-4' />
								</Button>
							</AlertDialogTrigger>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>{t('tip')}</AlertDialogTitle>
									<AlertDialogDescription>
										{t('setting_engine_page_mine_engine_delete_alert')}
									</AlertDialogDescription>
								</AlertDialogHeader>
								<AlertDialogFooter>
									<Button
										variant={'destructive'}
										onClick={async () => {
											const res = await mutateDeleteEngine.mutateAsync({
												engine_id: engine_info.id,
											});
											if (res.success) {
												setDeleteDialogOpen(false);
											}
										}}
										disabled={mutateDeleteEngine.isPending}>
										{t('confirm')}
										{mutateDeleteEngine.isPending && (
											<Loader2 className='animate-spin' />
										)}
									</Button>
									<AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					</CardTitle>
					<CardDescription className='flex flex-col flex-1'>
						<span className='mb-2'>{engine_info.description}</span>
						<div className='flex flex-wrap items-center gap-2'>
							{engine_info.is_public && (
								<Badge className='bg-amber-600/10 dark:bg-amber-600/20 hover:bg-amber-600/10 text-amber-500 shadow-none rounded-full'>
									<Globe2Icon className='mr-1 size-3.5' />
									Public
								</Badge>
							)}
							{shouldShowPlanLevelIndicator(
								engine_info.required_plan_level,
								mainUserInfo,
							) && (
								<Badge className='w-fit rounded-full border-sky-500/30 bg-sky-500/10 text-sky-700 shadow-none dark:text-sky-200'>
									<SubscriptionPlanBadgeContent
										requiredPlanLevel={engine_info.required_plan_level}
										showActions={subscriptionLocked}
									/>
								</Badge>
							)}
							{engine_info.is_forked && subscriptionLocked && (
								<Badge className='w-fit rounded-full border-rose-500/25 bg-rose-500/10 text-rose-700 shadow-none dark:text-rose-200'>
									<BanIcon className='mr-1 size-3.5' />
									{t('setting_subscription_locked_unavailable')}
									<span className='opacity-70'>·</span>
									{t(subscriptionLockedReasonKey)}
								</Badge>
							)}
							{engine_info.is_official_hosted && (
								<Badge className='w-fit rounded-full border-emerald-500/25 bg-emerald-500/10 text-emerald-700 shadow-none dark:text-emerald-200'>
									{t('setting_engine_billing_card_summary', {
										price: engine_info.billing_unit_price ?? 1,
										unit: t(`setting_engine_billing_mode_${billingMode}_unit`),
									})}
								</Badge>
							)}
							{engine_info.is_official_hosted &&
								(engine_info.compute_point_multiplier ?? 1) > 1 && (
									<Badge className='w-fit rounded-full border-slate-500/25 bg-slate-500/10 text-slate-700 shadow-none dark:text-slate-200'>
										{t('setting_compute_point_multiplier_badge', {
											value: engine_info.compute_point_multiplier ?? 1,
										})}
									</Badge>
								)}
						</div>
					</CardDescription>
				</CardHeader>
				<CardContent className='relative flex flex-nowrap items-center gap-2'>
					<Badge className='rounded-full mr-auto pl-[2px]' variant={'outline'}>
						<div className='rounded-full bg-indigo-600 p-1'>
							{engine_info.category === EngineCategory.IMAGE_GENERATE && (
								<ImageIcon className='size-4' color='white' />
							)}
							{engine_info.category === EngineCategory.TTS && (
								<AudioLinesIcon className='size-4' color='white' />
							)}
							{engine_info.category === EngineCategory.Markdown && (
								<TextIcon className='size-4' color='white' />
							)}
							{engine_info.category === EngineCategory.STT && (
								<MicIcon className='size-4' color='white' />
							)}
						</div>
						{getEngineCategoryLabel(
							engine_info.category,
							locale as 'en' | 'zh',
						)}
					</Badge>
					<EngineUpdate engineId={engine_info.id} />
					{!isMineEngine && (
						<>
							{!engine_info.is_forked && (
								<Button
									className='shadow-none text-xs'
									variant={'outline'}
									disabled={subscriptionLocked || mutateForkEngine.isPending}
									onClick={() => {
										if (subscriptionLocked) {
											return;
										}
										mutateForkEngine.mutate({
											engine_id: engine_info.id,
											status: true,
										});
									}}>
									{t('setting_engine_fork')}
									{mutateForkEngine.isPending && (
										<Loader2 className='h-4 w-4 animate-spin' />
									)}
								</Button>
							)}
							{engine_info.is_forked && (
								<Button
									className='shadow-none text-xs'
									variant={'destructive'}
									disabled={mutateForkEngine.isPending}
									onClick={() => {
										mutateForkEngine.mutate({
											engine_id: engine_info.id,
											status: false,
										});
									}}>
									{t('setting_model_provider_unfork')}
									{mutateForkEngine.isPending && (
										<Loader2 className='h-4 w-4 animate-spin' />
									)}
								</Button>
							)}
						</>
					)}
				</CardContent>
				<CardFooter className='flex flex-row items-center'>
					<Avatar
						className='size-5'
						title={
							engine_info.creator.nickname
								? engine_info.creator.nickname
								: 'Unknown User'
						}
						onClick={(e) => {
							router.push(`/user/detail/${engine_info.creator.id}`);
							e.preventDefault();
							e.stopPropagation();
						}}>
						<AvatarImage
							src={
								replacePath(
									engine_info.creator.avatar,
									engine_info.creator.id,
								) ?? ''
							}
							alt='user avatar'
							className='size-5 object-cover'
						/>
						<AvatarFallback className='size-5 font-semibold'>
							{engine_info.creator.nickname.slice(0, 1) ?? '?'}
						</AvatarFallback>
					</Avatar>
					<span className='text-xs text-muted-foreground ml-2'>
						{engine_info.creator.nickname}
					</span>
					<span className='ml-auto text-xs text-muted-foreground'>
						{engine_info.create_time &&
							formatInUserTimeZone(engine_info.create_time, 'yyyy-MM-dd HH:mm')}
					</span>
				</CardFooter>
			</Card>
		</>
	);
};
export default MineEngineCard;
