'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'nextjs-toploader/app';
import Cookies from 'js-cookie';
import {
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { createEmailUser } from '@/service/user';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useUserContext } from '@/provider/user-provider';
import { utils } from '@kinda/utils';
import { useTranslations } from 'next-intl';

export function RegisterFormLocal() {
	const t = useTranslations();

	const formSchema = z
		.object({
			email: z.string().email(t('seo_register_email_format_error')),
			password: z.string().min(8, t('seo_register_password_no_less_than')),
			passwordAgain: z.string().min(8, t('seo_register_password_no_less_than')),
		})
		.refine((data) => data.password === data.passwordAgain, {
			message: t('seo_register_password_again_different'),
			path: ['passwordAgain'],
		});

	const router = useRouter();
	const [submitting, setSubmitting] = useState(false);
	const { refreshMainUserInfo } = useUserContext();
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			email: '',
			password: '',
			passwordAgain: '',
		},
	});

	const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		if (event) {
			if (typeof event.preventDefault === 'function') {
				event.preventDefault();
			}
			if (typeof event.stopPropagation === 'function') {
				event.stopPropagation();
			}
		}
		return form.handleSubmit(onSuccess, onError)(event);
	};

	const onSuccess = async (values: z.infer<typeof formSchema>) => {
		setSubmitting(true);
		const [res, err] = await utils.to(
			createEmailUser({
				email: values.email,
				password: values.password,
			})
		);
		if (err || !res) {
			toast.error(err.message);
			setSubmitting(false);
			return;
		}
		toast.success(t('seo_register_success'));
		Cookies.set('access_token', res.access_token);
		Cookies.set('refresh_token', res.refresh_token);
		refreshMainUserInfo();
		router.push('/dashboard');
		setSubmitting(false);
	};

	const onError = (errors: any) => {
		console.error(errors);
		toast.error(t('form_validate_failed'));
	};

	return (
		<Form {...form}>
			<form onSubmit={onSubmit} className='w-full space-y-2'>
				<CardHeader className='mb-5 px-0 pb-0 pt-0'>
					<CardTitle className='text-[1.95rem] tracking-tight'>
						{t('seo_register')}
					</CardTitle>
					<CardDescription className='text-sm leading-6'>
						{t('seo_register_description')}
					</CardDescription>
				</CardHeader>
				<CardContent className='px-0'>
					<FormField
						control={form.control}
						name='email'
						render={({ field }) => (
							<FormItem className='mb-5'>
								<FormLabel>{t('seo_register_form_email')}</FormLabel>
								<FormControl>
									<Input
										className='h-11 rounded-xl border-border/70 bg-background/80 shadow-none'
										placeholder={t('seo_register_form_email_placeholder')}
										{...field}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name='password'
						render={({ field }) => (
							<FormItem className='mb-5'>
								<FormLabel>{t('seo_register_form_password')}</FormLabel>
								<FormControl>
									<Input
										className='h-11 rounded-xl border-border/70 bg-background/80 shadow-none'
										type='password'
										placeholder={t('seo_register_form_password_placeholder')}
										{...field}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name='passwordAgain'
						render={({ field }) => (
							<FormItem className='mb-5'>
								<FormLabel>{t('seo_register_form_password_again')}</FormLabel>
								<FormControl>
									<Input
										className='h-11 rounded-xl border-border/70 bg-background/80 shadow-none'
										type='password'
										placeholder={t(
											'seo_register_form_password_again_placeholder'
										)}
										{...field}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<Button
						className='h-11 w-full rounded-xl'
						type='submit'
						disabled={submitting}>
						{t('seo_register_submit')}
						{submitting && <Loader2 className='size-4 animate-spin' />}
					</Button>
					<div className='mt-4 text-center text-sm'>
						<span className='mr-2'>
							{t('seo_register_already_have_account')}
						</span>
						<Link href='/login' className='underline'>
							{t('seo_login_go_to_login')}
						</Link>
					</div>
				</CardContent>
			</form>
		</Form>
	);
}
