import { BanIcon, Loader2, SaveIcon } from 'lucide-react';
import { Button } from '../ui/button';
import { useTranslations } from 'next-intl';
import { utils } from '@kinda/utils';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { getQueryClient } from '@/lib/get-query-client';
import { Input } from '../ui/input';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormField, FormMessage } from '../ui/form';
import { createAiModel } from '@/service/ai';
import { ModelProvider } from '@/generated';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '../ui/select';
import { AccessPlanLevel } from '@/enums/product';
import { getPlanLevelTranslationKey } from '@/lib/subscription';

interface ModelAddCardProps {
	modelProvider: ModelProvider;
	onCancel: () => void;
	onSuccess: () => void;
}

const ModelAddCard = ({
	modelProvider,
	onCancel,
	onSuccess,
}: ModelAddCardProps) => {
	const t = useTranslations();

	const addFormSchema = z.object({
		name: z.string().min(1, 'name needed'),
		required_plan_level: z.number().int(),
	});

	const updateForm = useForm({
		resolver: zodResolver(addFormSchema),
		defaultValues: {
			name: '',
			required_plan_level: AccessPlanLevel.FREE,
		},
	});
	const [submitPending, startSubmit] = useTransition();

	const handleSubmitAddForm = async (
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

	const onFormValidateSuccess = async (
		values: z.infer<typeof addFormSchema>
	) => {
		startSubmit(async () => {
			const [res, err] = await utils.to(
				createAiModel({
					name: values.name,
					description: values.name,
					required_plan_level: values.required_plan_level,
					provider_id: modelProvider.id,
				})
			);
			if (err) {
				toast.error(`${t('setting_model_add_failed')}, ${err}`);
				return;
			}
			toast.success(t('setting_model_add_success'));
			onSuccess();
		});
	};

	const onFormValidateError = (errors: any) => {
		console.error(errors);
		toast.error(t('form_validate_failed'));
	};

	return (
		<>
			<div className='rounded p-3 text-sm flex items-center justify-between gap-2 bg-muted/50'>
				<Form {...updateForm}>
					<form
						id='update-form'
						className='flex w-full min-w-0 items-center gap-2'
						onSubmit={handleSubmitAddForm}>
						<FormField
							name='name'
							control={updateForm.control}
							render={({ field }) => {
								return (
									<div className='min-w-0 flex-1'>
										<Input
											placeholder={t('setting_model_name_placeholder')}
											className='font-mono'
											autoFocus
											{...field}
										/>
										<FormMessage className='hidden' />
									</div>
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
									<SelectTrigger className='w-fit shrink-0'>
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
				<div className='flex flex-row items-center gap-2'>
					<Button type='submit' variant={'outline'} form='update-form'>
						<SaveIcon />
						{submitPending && <Loader2 className='animate-spin' />}
					</Button>
					<Button type='button' variant={'outline'} onClick={() => onCancel()}>
						<BanIcon />
					</Button>
				</div>
			</div>
		</>
	);
};

export default ModelAddCard;
