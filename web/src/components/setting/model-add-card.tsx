import {
	BanIcon,
	Loader2,
	PencilIcon,
	SaveIcon,
	TrashIcon,
} from 'lucide-react';
import { Button } from '../ui/button';
import { useTranslations } from 'next-intl';
import { utils } from '@kinda/utils';
import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { getQueryClient } from '@/lib/get-query-client';
import { Input } from '../ui/input';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormField, FormMessage } from '../ui/form';
import { createAiModel } from '@/service/ai';
import { ModelProvider } from '@/generated';

const addFormSchema = z.object({
	name: z.string().min(1, '模型名称不能为空'),
});

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
	const updateForm = useForm({
		resolver: zodResolver(addFormSchema),
		defaultValues: {
			name: '',
		},
	});
	const queryClient = getQueryClient();
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
					provider_id: modelProvider.id,
					api_key: '',
					api_url: '',
				})
			);
			if (err) {
				toast.error('创建模型失败，请稍后再试');
				return;
			}
			toast.success('创建模型成功');
			onSuccess();
		});
	};

	const onFormValidateError = (errors: any) => {
		console.error(errors);
		toast.error(t('form_validate_failed'));
	};

	return (
		<>
			<div className='rounded p-3 text-sm flex items-center justify-between bg-muted/50'>
				<Form {...updateForm}>
					<form
						id='update-form'
						className='w-full mr-2'
						onSubmit={handleSubmitAddForm}>
						<FormField
							name='name'
							control={updateForm.control}
							render={({ field }) => {
								return (
									<>
										<Input
											placeholder='请输入模型名称'
											className='mr-2 mb-2 font-mono'
											autoFocus
											{...field}
										/>
										<FormMessage />
									</>
								);
							}}
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
