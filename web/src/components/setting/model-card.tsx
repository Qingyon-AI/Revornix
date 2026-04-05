import { Model } from '@/generated';
import {
	BanIcon,
	Loader2,
	PencilIcon,
	ShieldCheck,
	TrashIcon,
	XIcon,
} from 'lucide-react';
import { Button } from '../ui/button';
import { useTranslations } from 'next-intl';
import { utils } from '@kinda/utils';
import { useState, useTransition } from 'react';
import { deleteAiModel, updateAiModel } from '@/service/ai';
import { toast } from 'sonner';
import { getQueryClient } from '@/lib/get-query-client';
import { Input } from '../ui/input';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormField, FormMessage } from '../ui/form';
import { AccessPlanLevel } from '@/enums/product';
import {
	getPlanLevelTranslationKey,
	getSubscriptionLockReasonTranslationKey,
	isModelSubscriptionLocked,
	shouldShowPlanLevelIndicator,
} from '@/lib/subscription';
import { Badge } from '../ui/badge';
import { useUserContext } from '@/provider/user-provider';
import SubscriptionPlanBadgeContent from './subscription-plan-badge-content';
import ModelPolicyFields from './model-policy-fields';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '../ui/alert-dialog';

interface ModelCardProps {
	model: Model;
}

const updateFormSchema = z.object({
	name: z.string().min(1),
	required_plan_level: z.number().int(),
	is_official_hosted: z.boolean(),
	compute_point_multiplier: z.number().positive(),
});

const ModelCard = ({ model }: ModelCardProps) => {
	const t = useTranslations();
	const { mainUserInfo, paySystemUserInfo } = useUserContext();
	const queryClient = getQueryClient();
	const [editing, setEditing] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [updatePending, startUpdate] = useTransition();
	const [deletePending, startDelete] = useTransition();

	const subscriptionLocked = isModelSubscriptionLocked(
		model.required_plan_level,
		model.provider.creator.id,
		paySystemUserInfo,
		mainUserInfo,
	);
	const showPlanLevelBadge = shouldShowPlanLevelIndicator(
		model.required_plan_level,
		mainUserInfo,
	);
	const subscriptionLockedReasonKey = getSubscriptionLockReasonTranslationKey(
		paySystemUserInfo,
		model.required_plan_level,
	);

	const form = useForm({
		resolver: zodResolver(updateFormSchema),
		defaultValues: {
			name: model.name,
			required_plan_level: model.required_plan_level ?? AccessPlanLevel.FREE,
			is_official_hosted: model.is_official_hosted ?? false,
			compute_point_multiplier: model.compute_point_multiplier ?? 1,
		},
	});

	const resetForm = () => {
		form.reset({
			name: model.name,
			required_plan_level: model.required_plan_level ?? AccessPlanLevel.FREE,
			is_official_hosted: model.is_official_hosted ?? false,
			compute_point_multiplier: model.compute_point_multiplier ?? 1,
		});
	};

	const handleDeleteModel = async () => {
		startDelete(async () => {
			const [res, err] = await utils.to(
				deleteAiModel({
					model_ids: [model.id],
				}),
			);
			if (err) {
				toast.error(err.message || t('setting_model_add_failed'));
				return;
			}
			if (res) {
				toast.success(t('setting_model_delete_success'));
				await queryClient.invalidateQueries({
					queryKey: ['getModels', model.provider.id],
				});
				setDeleteDialogOpen(false);
			}
		});
	};

	const handleUpdateModel = async (
		values: z.infer<typeof updateFormSchema>,
	) => {
		startUpdate(async () => {
			const [res, err] = await utils.to(
				updateAiModel({
					id: model.id,
					name: values.name,
					required_plan_level: values.required_plan_level,
					is_official_hosted: values.is_official_hosted,
					compute_point_multiplier: values.is_official_hosted
						? values.compute_point_multiplier
						: 1,
				}),
			);
			if (err) {
				toast.error(t('setting_model_update_failed'));
				return;
			}
			toast.success(t('setting_model_update_success'));
			await queryClient.invalidateQueries({
				queryKey: ['getModels', model.provider.id],
			});
			await queryClient.invalidateQueries({
				queryKey: ['getModels'],
			});
			setEditing(false);
		});
	};

	const handleSubmitUpdateForm = async (
		event: React.FormEvent<HTMLFormElement>,
	) => {
		if (event) {
			if (typeof event.preventDefault === 'function') {
				event.preventDefault();
			}
			if (typeof event.stopPropagation === 'function') {
				event.stopPropagation();
			}
		}
		return form.handleSubmit(onFormValidateSuccess, onFormValidateError)(event);
	};

	const onFormValidateSuccess = async (
		values: z.infer<typeof updateFormSchema>,
	) => {
		await handleUpdateModel(values);
	};

	const onFormValidateError = (errors: any) => {
		console.error(errors);
		toast.error(t('form_validate_failed'));
	};

	return (
		<>
			<div className='rounded-2xl border border-border/70 bg-background p-5 shadow-sm transition-colors hover:border-border'>
				{editing ? (
					<Form {...form}>
						<form className='space-y-4' onSubmit={handleSubmitUpdateForm}>
							<div className='flex items-start justify-between gap-4'>
								<div className='space-y-1'>
									<div className='text-base font-semibold'>
										{t('setting_model_card_edit_title')}
									</div>
									<p className='text-sm text-muted-foreground'>
										{t('setting_model_card_edit_description')}
									</p>
								</div>
								<Button
									type='button'
									variant='ghost'
									size='icon'
									onClick={() => {
										resetForm();
										setEditing(false);
									}}>
									<XIcon className='size-4' />
								</Button>
							</div>
							<FormField
								name='name'
								control={form.control}
								render={({ field }) => (
									<div className='space-y-2'>
										<div className='text-sm font-medium'>
											{t('setting_model_name')}
										</div>
										<Input
											placeholder={t('setting_model_name_placeholder')}
											className='h-11 rounded-xl font-mono'
											{...field}
										/>
										<FormMessage />
									</div>
								)}
							/>
							<ModelPolicyFields form={form} />
							<div className='flex flex-wrap items-center justify-end gap-2 pt-1'>
								<Button
									type='button'
									variant='secondary'
									onClick={() => {
										resetForm();
										setEditing(false);
									}}>
									{t('cancel')}
								</Button>
								<Button type='submit' disabled={updatePending}>
									{t('confirm')}
									{updatePending && <Loader2 className='size-4 animate-spin' />}
								</Button>
							</div>
						</form>
					</Form>
				) : (
					<div className='space-y-4'>
						<div className='flex items-start justify-between gap-4'>
							<div className='min-w-0 space-y-2'>
								<p className='break-all font-mono text-base font-semibold leading-6'>
									{model.name}
								</p>
								<div className='flex flex-wrap items-center gap-2'>
									{model.is_official_hosted && (
										<Badge className='rounded-full border-emerald-500/25 bg-emerald-500/10 text-emerald-700 shadow-none dark:text-emerald-200'>
											<ShieldCheck className='mr-1 size-3.5' />
											{t('setting_official_hosted_badge')}
										</Badge>
									)}
									{(model.compute_point_multiplier ?? 1) > 1 && (
										<Badge variant='outline' className='rounded-full'>
											{t('setting_compute_point_multiplier_badge', {
												value: model.compute_point_multiplier ?? 1,
											})}
										</Badge>
									)}
								</div>
							</div>
							<div className='flex shrink-0 items-center gap-2'>
								<Button
									type='button'
									variant='outline'
									size='icon'
									className='size-10 rounded-xl'
									onClick={() => {
										resetForm();
										setEditing(true);
									}}>
									<PencilIcon className='size-4' />
								</Button>
								<Button
									type='button'
									variant='outline'
									size='icon'
									className='size-10 rounded-xl'
									onClick={() => setDeleteDialogOpen(true)}>
									{deletePending ? (
										<Loader2 className='size-4 animate-spin' />
									) : (
										<TrashIcon className='size-4' />
									)}
								</Button>
							</div>
						</div>

						<div className='grid gap-3 md:grid-cols-2'>
							<div className='rounded-xl border border-input/70 bg-muted/40 p-4'>
								<div className='text-sm font-medium'>
									{t('setting_required_plan_level_label')}
								</div>
								<div className='mt-2 flex flex-wrap items-center gap-2'>
									{showPlanLevelBadge && (
										<Badge
											variant='secondary'
											className='rounded-full border border-sky-500/35 bg-sky-500/12 px-2.5 py-1 text-xs text-sky-700 shadow-none dark:text-sky-200'>
											<SubscriptionPlanBadgeContent
												requiredPlanLevel={model.required_plan_level}
												showActions={subscriptionLocked}
											/>
										</Badge>
									)}
									{showPlanLevelBadge && !subscriptionLocked && (
										<span className='text-xs text-muted-foreground'>
											{t('setting_model_card_access_ok')}
										</span>
									)}
									{showPlanLevelBadge && subscriptionLocked && (
										<Badge
											variant='secondary'
											className='rounded-full border border-rose-500/25 bg-rose-500/10 px-2.5 py-1 text-xs text-rose-700 dark:text-rose-200'>
											<BanIcon className='mr-1 size-3.5' />
											{t('setting_subscription_locked_unavailable')}
											<span className='mx-1 opacity-70'>·</span>
											{t(subscriptionLockedReasonKey)}
										</Badge>
									)}
									{!showPlanLevelBadge && (
										<span className='text-sm text-muted-foreground'>
											{t(getPlanLevelTranslationKey(model.required_plan_level))}
										</span>
									)}
								</div>
							</div>
							<div className='rounded-xl border border-input/70 bg-muted/40 p-4'>
								<div className='text-sm font-medium'>
									{t('setting_official_hosted_label')}
								</div>
								<p className='mt-2 text-sm text-muted-foreground'>
									{model.is_official_hosted
										? t('setting_model_card_billing_hosted')
										: t('setting_model_card_billing_custom')}
								</p>
							</div>
						</div>
					</div>
				)}
			</div>
			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{t('warning')}</AlertDialogTitle>
						<AlertDialogDescription>
							{t('setting_model_delete_warning_description')}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
						<AlertDialogAction
							onClick={(event) => {
								event.preventDefault();
								handleDeleteModel();
							}}
							disabled={deletePending}>
							{t('confirm')}
							{deletePending && <Loader2 className='size-4 animate-spin' />}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
};

export default ModelCard;
