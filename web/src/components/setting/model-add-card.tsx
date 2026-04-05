import { Loader2, PlusCircle, XIcon } from 'lucide-react';
import { Button } from '../ui/button';
import { useTranslations } from 'next-intl';
import { utils } from '@kinda/utils';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { Input } from '../ui/input';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormField, FormMessage } from '../ui/form';
import { createAiModel } from '@/service/ai';
import { ModelProvider } from '@/generated';
import { AccessPlanLevel } from '@/enums/product';
import ModelPolicyFields from './model-policy-fields';

interface ModelAddCardProps {
	modelProvider: ModelProvider;
	onCancel: () => void;
	onSuccess: () => void;
}

const addFormSchema = z.object({
	name: z.string().min(1, 'name needed'),
	required_plan_level: z.number().int(),
	is_official_hosted: z.boolean(),
	compute_point_multiplier: z.number().positive(),
});

const ModelAddCard = ({
	modelProvider,
	onCancel,
	onSuccess,
}: ModelAddCardProps) => {
	const t = useTranslations();
	const [submitPending, startSubmit] = useTransition();
	const form = useForm({
		resolver: zodResolver(addFormSchema),
		defaultValues: {
			name: '',
			required_plan_level: AccessPlanLevel.FREE,
			is_official_hosted: false,
			compute_point_multiplier: 1,
		},
	});

	const handleSubmitAddForm = async (
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
		values: z.infer<typeof addFormSchema>,
	) => {
		startSubmit(async () => {
			const [res, err] = await utils.to(
				createAiModel({
					name: values.name,
					description: null,
					required_plan_level: values.required_plan_level,
					is_official_hosted: values.is_official_hosted,
					compute_point_multiplier: values.is_official_hosted
						? values.compute_point_multiplier
						: 1,
					provider_id: modelProvider.id,
				}),
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
		<div className='rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-5 shadow-sm'>
			<div className='mb-4 flex items-start justify-between gap-4'>
				<div className='space-y-1'>
					<div className='flex items-center gap-2 text-base font-semibold'>
						<PlusCircle className='size-4 text-emerald-600' />
						{t('setting_model_add')}
					</div>
					<p className='text-sm text-muted-foreground'>
						{t('setting_model_card_add_description')}
					</p>
				</div>
				<Button type='button' variant='ghost' size='icon' onClick={onCancel}>
					<XIcon className='size-4' />
				</Button>
			</div>
			<Form {...form}>
				<form className='space-y-4' onSubmit={handleSubmitAddForm}>
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
									autoFocus
									{...field}
								/>
								<FormMessage />
							</div>
						)}
					/>
					<ModelPolicyFields form={form} />
					<div className='flex flex-wrap items-center justify-end gap-2 pt-1'>
						<Button type='button' variant='secondary' onClick={onCancel}>
							{t('cancel')}
						</Button>
						<Button type='submit' disabled={submitPending}>
							{t('confirm')}
							{submitPending && <Loader2 className='size-4 animate-spin' />}
						</Button>
					</div>
				</form>
			</Form>
		</div>
	);
};

export default ModelAddCard;
