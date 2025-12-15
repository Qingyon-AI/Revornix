import { Model } from '@/generated';
import { Loader2, PencilIcon, SaveIcon, TrashIcon } from 'lucide-react';
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

interface ModelCardProps {
	model: Model;
}

const updateFormSchema = z.object({
	name: z.string().min(1),
});

const ModelCard = ({ model }: ModelCardProps) => {
	const t = useTranslations();
	const updateForm = useForm({
		resolver: zodResolver(updateFormSchema),
		defaultValues: {
			name: model.name,
		},
	});
	const queryClient = getQueryClient();
	const [editing, setEditing] = useState(false);
	const [updatePending, startUpdate] = useTransition();
	const [deletePending, startDelete] = useTransition();

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

	const handleUpdateModel = async (values: { name: string }) => {
		startUpdate(async () => {
			const [res, err] = await utils.to(
				updateAiModel({
					id: model.id,
					name: values.name,
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

	const onFormValidateSuccess = async (
		values: z.infer<typeof updateFormSchema>
	) => {
		await handleUpdateModel(values);
	};

	const onFormValidateError = (errors: any) => {
		console.error(errors);
		toast.error(t('form_validate_failed'));
	};

	return (
		<>
			<div className='rounded p-3 text-sm flex items-center justify-between bg-muted hover:bg-muted/80'>
				{editing ? (
					<Form {...updateForm}>
						<form
							id='update-form'
							className='w-full mr-2'
							onSubmit={handleSubmitUpdateForm}>
							<FormField
								name='name'
								control={updateForm.control}
								render={({ field }) => {
									return (
										<Input
											placeholder={t('setting_model_name_placeholder')}
											className='mr-2 font-mono'
											{...field}
										/>
									);
								}}
							/>
						</form>
					</Form>
				) : (
					<p className='font-mono'>{model.name}</p>
				)}
				<div className='flex flex-row items-center gap-2'>
					{editing && (
						<Button
							type='submit'
							variant={'outline'}
							form='update-form'
							disabled={updatePending}>
							<SaveIcon />
							{updatePending && <Loader2 className='animate-spin' />}
						</Button>
					)}
					{!editing && (
						<Button
							type='button'
							variant={'outline'}
							onClick={() => setEditing(true)}>
							<PencilIcon />
						</Button>
					)}
					<Button
						type='button'
						variant={'outline'}
						onClick={() => {
							handleDeleteModel();
						}}>
						<TrashIcon />
						{deletePending && <Loader2 className='animate-spin' />}
					</Button>
				</div>
			</div>
		</>
	);
};

export default ModelCard;
