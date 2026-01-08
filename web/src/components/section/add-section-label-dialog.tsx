import {
	Dialog,
	DialogTitle,
	DialogClose,
	DialogContent,
	DialogFooter,
	DialogHeader,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { createLabel } from '@/service/section';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/get-query-client';
import { useTranslations } from 'next-intl';

const AddSectionLabelDialog = ({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) => {
	const t = useTranslations();
	const formSchema = z.object({
		name: z.string().min(1, t('section_label_create_title_needed')),
	});

	const queryClient = getQueryClient();
	const form = useForm<z.infer<typeof formSchema>>({
		defaultValues: {
			name: '',
		},
		resolver: zodResolver(formSchema),
	});

	const mutate = useMutation({
		mutationKey: ['createLabel'],
		mutationFn: createLabel,
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ['getSectionLabels'],
			});
		},
	});

	const onSubmitLabelForm = async (event: React.FormEvent<HTMLFormElement>) => {
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
		await mutate.mutateAsync(values);
		if (mutate.isError) {
			toast.error(mutate.error.message);
			return;
		}
		toast.success(t('section_label_create_success'));
		onOpenChange(false);
		form.reset();
	};

	const onFormValidateError = (errors: any) => {
		toast.error(t('form_validate_failed'));
		console.error(errors);
	};
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{t('section_form_label_create')}</DialogTitle>
				</DialogHeader>
				<Form {...form}>
					<form onSubmit={onSubmitLabelForm}>
						<FormField
							name='name'
							control={form.control}
							render={({ field }) => {
								return (
									<FormItem>
										<Input
											{...field}
											placeholder={t(
												'section_form_label_create_placeholder'
											)}
										/>
										<FormMessage />
									</FormItem>
								);
							}}
						/>
						<DialogFooter className='mt-5'>
							<Button type='submit' disabled={mutate.isPending}>
								{t('section_form_label_create_submit')}
								{mutate.isPending && <Loader2 />}
							</Button>
							<DialogClose asChild>
								<Button type='button' variant={'outline'}>
									{t('section_form_label_create_cancel')}
								</Button>
							</DialogClose>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
};
export default AddSectionLabelDialog;
