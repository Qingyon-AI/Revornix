import { Model } from '@/generated';
import { BanIcon, Loader2, PencilIcon, SaveIcon, TrashIcon } from 'lucide-react';
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
import { Form, FormField } from '../ui/form';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '../ui/select';
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

interface ModelCardProps {
	model: Model;
}

const updateFormSchema = z.object({
	name: z.string().min(1),
	required_plan_level: z.number().int(),
});

const ModelCard = ({ model }: ModelCardProps) => {
	const t = useTranslations();
	const { mainUserInfo, paySystemUserInfo } = useUserContext();
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
	const showUnavailableBadge =
		subscriptionLocked &&
		showPlanLevelBadge;
	const showBadgeRow = showPlanLevelBadge || showUnavailableBadge;
	const subscriptionLockedReasonKey = getSubscriptionLockReasonTranslationKey(
		paySystemUserInfo,
		model.required_plan_level,
	);
	const updateForm = useForm({
		resolver: zodResolver(updateFormSchema),
		defaultValues: {
			name: model.name,
			required_plan_level: model.required_plan_level ?? AccessPlanLevel.FREE,
		},
	});
	const queryClient = getQueryClient();
	const [editing, setEditing] = useState(false);
	const [updatePending, startUpdate] = useTransition();
	const [deletePending, startDelete] = useTransition();
	const updateFormId = `update-model-form-${model.id}`;

	const handleDeleteModel = async () => {
		startDelete(async () => {
			const [res, err] = await utils.to(
				deleteAiModel({
					model_ids: [model.id],
				})
			);
			if (err) {
				toast.error(err.message || t('setting_model_add_failed'));
				return;
			}
			if (res) {
				toast.success(t('setting_model_delete_success'));
				// Refetch the models
				await queryClient.invalidateQueries({
					queryKey: ['getModels', model.provider.id],
				});
			}
		});
	};

	const handleUpdateModel = async (values: {
		name: string;
		required_plan_level: number;
	}) => {
		startUpdate(async () => {
			const [res, err] = await utils.to(
				updateAiModel({
					id: model.id,
					name: values.name,
					required_plan_level: values.required_plan_level,
				})
			);
			if (err) {
				toast.error(t('setting_model_update_failed'));
				return;
			}
			toast.success(t('setting_model_update_success'));
			// Refetch the models
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
		event: React.FormEvent<HTMLFormElement>
	) => {
		if (event) {
			if (typeof event.preventDefault === 'function') {
				event.preventDefault();
			}
			if (typeof event.stopPropagation === 'function') {
				event.stopPropagation();
			}
		}
		return updateForm.handleSubmit(
			onFormValidateSuccess,
			onFormValidateError
		)(event);
	};

	const onFormValidateSuccess = async (values: z.infer<typeof updateFormSchema>) => {
		await handleUpdateModel(values);
	};

	const onFormValidateError = (errors: any) => {
		console.error(errors);
		toast.error(t('form_validate_failed'));
	};

	const handleStartEditing = (
		event: React.MouseEvent<HTMLButtonElement>
	) => {
		event.preventDefault();
		event.stopPropagation();
		updateForm.reset({
			name: model.name,
			required_plan_level: model.required_plan_level ?? AccessPlanLevel.FREE,
		});
		setEditing(true);
	};

	return (
		<>
			<div className='rounded-xl bg-muted px-4 py-3 text-sm transition-colors hover:bg-muted/80'>
				{editing ? (
					<div key='editing' className='flex items-center gap-3'>
						<Form {...updateForm}>
							<form
								id={updateFormId}
								className='mr-2 flex w-full min-w-0 items-center gap-2'
								onSubmit={handleSubmitUpdateForm}>
								<FormField
									name='name'
									control={updateForm.control}
									render={({ field }) => {
										return (
											<Input
												placeholder={t('setting_model_name_placeholder')}
												className='min-w-0 flex-1 font-mono'
												{...field}
											/>
										);
									}}
								/>
								<FormField
									name='required_plan_level'
									control={updateForm.control}
									render={({ field }) => (
										<Select
											value={String(field.value ?? AccessPlanLevel.FREE)}
											onValueChange={(value) => field.onChange(Number(value))}>
											<SelectTrigger className='w-[132px] shrink-0'>
												<SelectValue
													placeholder={t('setting_required_plan_level_placeholder')}
												/>
											</SelectTrigger>
											<SelectContent>
												<SelectGroup>
													{[
														AccessPlanLevel.FREE,
														AccessPlanLevel.PRO,
														AccessPlanLevel.MAX,
													].map((level) => (
														<SelectItem key={level} value={String(level)}>
															{t(getPlanLevelTranslationKey(level))}
														</SelectItem>
													))}
												</SelectGroup>
											</SelectContent>
										</Select>
									)}
								/>
							</form>
						</Form>
						<div className='flex shrink-0 items-center gap-2'>
								<Button
									type='submit'
									variant={'outline'}
									size='icon'
									form={updateFormId}
									disabled={updatePending}
									className='size-11 rounded-xl'>
								<SaveIcon />
								{updatePending && <Loader2 className='animate-spin' />}
							</Button>
							<Button
								type='button'
								variant={'outline'}
								size='icon'
								className='size-11 rounded-xl'
								onClick={() => setEditing(false)}>
								<BanIcon />
							</Button>
						</div>
					</div>
				) : (
					<div key='view' className='flex items-center justify-between gap-4'>
						<div className='min-w-0 flex-1'>
							<p className='break-all font-mono text-base font-medium leading-6'>
								{model.name}
							</p>
							{showBadgeRow && (
								<div className='mt-2.5 flex flex-wrap items-center gap-2'>
									{showPlanLevelBadge && (
										<Badge
											variant='secondary'
											className='rounded-full border border-sky-500/35 bg-sky-500/12 px-2.5 py-1 text-xs text-sky-700 shadow-none dark:text-sky-200'>
											<SubscriptionPlanBadgeContent
												requiredPlanLevel={model.required_plan_level}
											/>
										</Badge>
									)}
									{showUnavailableBadge && (
										<Badge
											variant='secondary'
											className='rounded-full border border-rose-500/25 bg-rose-500/10 px-2.5 py-1 text-xs text-rose-700 dark:text-rose-200'>
											<BanIcon className='mr-1 size-3.5' />
											{t('setting_subscription_locked_unavailable')}
											<span className='mx-1 opacity-70'>·</span>
											{t(subscriptionLockedReasonKey)}
										</Badge>
									)}
								</div>
							)}
						</div>
						<div className='flex shrink-0 items-center gap-2'>
								<Button
									type='button'
									variant={'outline'}
									size='icon'
									className='size-11 rounded-xl'
									onClick={handleStartEditing}>
									<PencilIcon />
								</Button>
							<Button
								type='button'
								variant={'outline'}
								size='icon'
								className='size-11 rounded-xl'
								onClick={() => {
									handleDeleteModel();
								}}>
								<TrashIcon />
								{deletePending && <Loader2 className='animate-spin' />}
							</Button>
						</div>
					</div>
				)}
			</div>
		</>
	);
};

export default ModelCard;
