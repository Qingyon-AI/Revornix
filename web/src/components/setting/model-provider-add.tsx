'use client';
import { useState, useTransition } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createAiModelProvider } from '@/service/ai';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { utils } from '@kinda/utils';
import { getQueryClient } from '@/lib/get-query-client';
import {
	Form,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { Loader2, PlusCircleIcon } from 'lucide-react';

const ModelProviderAddButton = () => {
	const t = useTranslations();
	const formSchema = z.object({
		name: z.string().min(1, 'Name is required'),
		description: z.string(),
		api_key: z.string().min(1, 'API Key is required'),
		base_url: z.string(),
	});
	const queryClient = getQueryClient();

	const form = useForm({
		resolver: zodResolver(formSchema),
		defaultValues: {
			name: '',
			description: '',
			api_key: '',
			base_url: '',
		},
	});
	const [showModelProviderConfigDialog, setShowModelProviderConfigDialog] =
		useState(false);
	const [submitUpdating, startSubmitUpdating] = useTransition();

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
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

	const onFormValidateSuccess = async (values: z.infer<typeof formSchema>) => {
		startSubmitUpdating(async () => {
			const [res, err] = await utils.to(
				createAiModelProvider({
					...values,
				})
			);
			if (err) {
				toast.error(err.message);
				return;
			}
			toast.success(t('setting_model_provider_add_successful'));
			setShowModelProviderConfigDialog(false);
			queryClient.invalidateQueries({
				queryKey: ['getModelProviders'],
			});
			queryClient.invalidateQueries({
				queryKey: ['getModels'],
			});
		});
	};

	const onFormValidateError = (errors: any) => {
		console.error(errors);
		toast.error(t('form_validate_failed'));
	};

	return (
		<>
			<Dialog
				open={showModelProviderConfigDialog}
				onOpenChange={setShowModelProviderConfigDialog}>
				<DialogTrigger asChild>
					<Button>
						{t('setting_model_provider_add')}
						<PlusCircleIcon />
					</Button>
				</DialogTrigger>
				<DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
					<DialogHeader>
						<DialogTitle>{t('setting_model_provider_add')}</DialogTitle>
						<DialogDescription>
							{t('setting_model_provider_add_description')}
						</DialogDescription>
					</DialogHeader>
					<div>
						<Form {...form}>
							<form className='flex flex-col gap-5' onSubmit={handleSubmit}>
								<FormField
									control={form.control}
									name='name'
									render={({ field }) => (
										<FormItem>
											<div className='grid grid-cols-12 gap-2'>
												<FormLabel className='col-span-3'>
													{t('setting_model_provider_name')}
												</FormLabel>
												<Input
													type='text'
													className='col-span-9'
													placeholder='Name'
													{...field}
												/>
											</div>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name='description'
									render={({ field }) => (
										<FormItem>
											<div className='grid grid-cols-12 gap-2'>
												<FormLabel className='col-span-3'>
													{t('setting_model_provider_description')}
												</FormLabel>
												<Input
													type='text'
													className='col-span-9'
													placeholder='Description'
													{...field}
												/>
											</div>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name='api_key'
									render={({ field }) => (
										<FormItem>
											<div className='grid grid-cols-12 gap-2'>
												<FormLabel className='col-span-3'>API Key</FormLabel>
												<Input
													type='password'
													className='col-span-9'
													placeholder='API Key'
													{...field}
												/>
											</div>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name='base_url'
									render={({ field }) => (
										<FormItem>
											<div className='grid grid-cols-12 gap-2'>
												<FormLabel className='col-span-3'>API Base</FormLabel>
												<Input
													className='col-span-9'
													placeholder='API Base'
													{...field}
												/>
											</div>
											<FormMessage />
										</FormItem>
									)}
								/>
								<Button type='submit' disabled={submitUpdating}>
									{t('save')}
									{submitUpdating && (
										<Loader2 className='h-4 w-4 animate-spin' />
									)}
								</Button>
							</form>
						</Form>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
};

export default ModelProviderAddButton;
