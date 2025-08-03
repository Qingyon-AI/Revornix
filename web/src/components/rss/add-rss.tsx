import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import z from 'zod';
import { Form, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import MultipleSelector, { type Option } from '../ui/multiple-selector';
import { Skeleton } from '../ui/skeleton';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getAllMineSections } from '@/service/section';
import { createRssServer } from '@/service/rss';
import { toast } from 'sonner';
import { getQueryClient } from '@/lib/get-query-client';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { PlusCircle } from 'lucide-react';

const AddRss = () => {
	const t = useTranslations();
	const queryClient = getQueryClient();
	const [showAddDialog, setShowAddDialog] = useState(false);

	const formSchema = z.object({
		title: z.string(),
		description: z.string(),
		address: z.string(),
		section_ids: z.array(z.number()),
	});

	const form = useForm({
		resolver: zodResolver(formSchema),
		defaultValues: {
			title: '',
			description: '',
			address: '',
			section_ids: [],
		},
	});

	const { data: sections } = useQuery({
		queryKey: ['getMineDocumentSections'],
		queryFn: getAllMineSections,
	});

	const getSectionByValue = (value: number): Option | undefined => {
		if (!sections) return;
		return sections.data
			.map((section) => {
				return { label: section.title, value: section.id };
			})
			.find((section) => section.value === value);
	};

	const mutateAddRssServer = useMutation({
		mutationFn: createRssServer,
		onSuccess(data, variables, context) {
			queryClient.invalidateQueries({
				queryKey: ['searchMyRssServers', ''],
			});
			setShowAddDialog(false);
		},
		onError(error, variables, context) {
			toast.error(error.message);
			console.error(error);
		},
	});

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
		mutateAddRssServer.mutate(values);
	};

	const onFormValidateError = (errors: any) => {
		toast.error(t('form_validate_failed'));
		console.error(errors);
	};

	return (
		<Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
			<DialogTrigger asChild>
				<Button>
					{t('rss_add')}
					<PlusCircle />
				</Button>
			</DialogTrigger>
			<DialogContent className='max-h-[80vh] overflow-auto'>
				<DialogHeader>
					<DialogTitle>{t('rss_add')}</DialogTitle>
					<DialogDescription>{t('rss_add_tips')}</DialogDescription>
				</DialogHeader>

				<Form {...form}>
					<form id='add-form' className='space-y-5' onSubmit={handleSubmit}>
						<FormField
							name='title'
							control={form.control}
							render={({ field }) => {
								return (
									<FormItem>
										<div className='grid grid-cols-12 gap-2'>
											<FormLabel className='col-span-3'>
												{t('rss_form_title')}
											</FormLabel>
											<div className='col-span-9'>
												<Input {...field} />
											</div>
										</div>
										<FormMessage />
									</FormItem>
								);
							}}
						/>
						<FormField
							name='description'
							control={form.control}
							render={({ field }) => {
								return (
									<FormItem>
										<div className='grid grid-cols-12 gap-2'>
											<FormLabel className='col-span-3'>
												{t('rss_form_description')}
											</FormLabel>
											<Textarea {...field} className='col-span-9' />
										</div>
										<FormMessage />
									</FormItem>
								);
							}}
						/>
						<FormField
							name='address'
							control={form.control}
							render={({ field }) => {
								return (
									<FormItem>
										<div className='grid grid-cols-12 gap-2'>
											<FormLabel className='col-span-3'>
												{t('rss_form_address')}
											</FormLabel>
											<Input {...field} className='col-span-9' />
										</div>
										<FormMessage />
									</FormItem>
								);
							}}
						/>
						{sections ? (
							<FormField
								control={form.control}
								name='section_ids'
								render={({ field }) => {
									return (
										<FormItem className='grid grid-cols-12 gap-2'>
											<FormLabel className='col-span-3'>
												{t('rss_form_sections')}
											</FormLabel>
											<div className='col-span-9'>
												<MultipleSelector
													defaultOptions={sections.data.map((section) => {
														return { label: section.title, value: section.id };
													})}
													onChange={(value) => {
														field.onChange(
															value.map(({ label, value }) => value)
														);
													}}
													value={
														field.value &&
														field.value
															.map((id) => getSectionByValue(id))
															.filter((option) => !!option)
													}
													emptyIndicator={
														<p className='text-center text-sm leading-10 text-gray-600 dark:text-gray-400'>
															{t('rss_form_section_empty')}
														</p>
													}
												/>
											</div>
										</FormItem>
									);
								}}
							/>
						) : (
							<Skeleton className='h-10' />
						)}
					</form>
				</Form>
				<DialogFooter>
					<DialogClose asChild>
						<Button>{t('cancel')}</Button>
					</DialogClose>
					<Button type='submit' form='add-form'>
						{t('submit')}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default AddRss;
