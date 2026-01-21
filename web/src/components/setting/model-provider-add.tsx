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
	FormDescription,
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
import { Switch } from '../ui/switch';
import { Textarea } from '../ui/textarea';

const ModelProviderAddButton = () => {
	const t = useTranslations();
	const formSchema = z.object({
		name: z.string().min(1, 'Name is required'),
		description: z.string().optional(),
		api_key: z.string().optional(),
		base_url: z.string().min(1, 'Base Url is required'),
		is_public: z.boolean(),
	});
	const queryClient = getQueryClient();

	const form = useForm({
		resolver: zodResolver(formSchema),
		defaultValues: {
			name: '',
			description: '',
			api_key: '',
			base_url: '',
			is_public: false,
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
				}),
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
			form.reset();
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
													placeholder={t(
														'setting_engine_page_engine_form_title_placeholder',
													)}
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
												<Textarea
													className='col-span-9'
													placeholder={t(
														'setting_engine_page_engine_form_description_placeholder',
													)}
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
												<FormLabel className='col-span-3'>Base Url</FormLabel>
												<Input
													className='col-span-9'
													placeholder='Base Url'
													{...field}
												/>
											</div>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									name='is_public'
									control={form.control}
									render={({ field }) => {
										return (
											<FormItem className='rounded-lg border border-input p-3'>
												<div className='flex flex-row gap-1 items-center'>
													<FormLabel className='flex flex-row gap-1 items-center'>
														{t('setting_model_provider_is_public')}
													</FormLabel>
													<Switch
														checked={field.value}
														onCheckedChange={(e) => {
															field.onChange(e);
														}}
													/>
												</div>
												<FormDescription>
													{t('setting_model_provider_is_public_tips')}
												</FormDescription>
											</FormItem>
										);
									}}
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
