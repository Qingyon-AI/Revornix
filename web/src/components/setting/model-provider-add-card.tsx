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
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, PlusIcon } from 'lucide-react';

const ModelProviderAddCard = () => {
	const t = useTranslations();
	const formSchema = z.object({
		name: z.string().min(1, 'Name is required'),
		description: z.string(),
		api_key: z.string().min(1, 'API Key is required'),
		api_url: z.string(),
	});
	const queryClient = getQueryClient();

	const form = useForm({
		resolver: zodResolver(formSchema),
		defaultValues: {
			name: '',
			description: '',
			api_key: '',
			api_url: '',
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
		});
	};

	const onFormValidateError = (errors: any) => {
		console.log(errors);
		toast.error(t('form_validate_failed'));
	};

	return (
		<>
			<Dialog
				open={showModelProviderConfigDialog}
				onOpenChange={setShowModelProviderConfigDialog}>
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
												<FormLabel className='col-span-2'>
													{t('setting_model_provider_name')}
												</FormLabel>
												<Input
													type='text'
													className='col-span-10'
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
												<FormLabel className='col-span-2'>
													{t('setting_model_provider_description')}
												</FormLabel>
												<Input
													type='text'
													className='col-span-10'
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
												<FormLabel className='col-span-2'>API Key</FormLabel>
												<Input
													type='password'
													className='col-span-10'
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
									name='api_url'
									render={({ field }) => (
										<FormItem>
											<div className='grid grid-cols-12 gap-2'>
												<FormLabel className='col-span-2'>API Base</FormLabel>
												<Input
													className='col-span-10'
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
			<Card>
				<CardContent
					className='flex-1 flex flex-col justify-center items-center text-sm rounded cursor-pointer'
					onClick={() => {
						setShowModelProviderConfigDialog(true);
					}}>
					<div className='mb-3 p-3 bg-muted rounded-full'>
						<PlusIcon className='h-12 w-12' />
					</div>
					<p>{t('setting_model_provider_add')}</p>
				</CardContent>
			</Card>
		</>
	);
};

export default ModelProviderAddCard;
