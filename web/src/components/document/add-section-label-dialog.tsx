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

const formSchema = z.object({
	name: z
		.string()
		.min(1, '标签名称不能为空')
		.max(20, '标签长度不得多于20个字符'),
});

const AddSectionLabelDialog = ({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) => {
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
		toast.success('添加标签成功');
		onOpenChange(false);
		form.reset();
	};

	const onFormValidateError = (errors: any) => {
		toast.error('表单校验失败');
		console.log(errors);
	};
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>增加标签</DialogTitle>
				</DialogHeader>
				<Form {...form}>
					<form onSubmit={onSubmitLabelForm}>
						<FormField
							name='name'
							control={form.control}
							render={({ field }) => {
								return (
									<FormItem>
										<Input {...field} placeholder='请输入标签名称' />
										<FormMessage />
									</FormItem>
								);
							}}
						/>
						<DialogFooter className='mt-5'>
							<Button type='submit' disabled={mutate.isPending}>
								确认
								{mutate.isPending && <Loader2 />}
							</Button>
							<DialogClose asChild>
								<Button type='button' variant={'outline'}>
									取消
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
