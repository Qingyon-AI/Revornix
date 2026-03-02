import { useTranslations } from 'next-intl';
import {
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from '../ui/form';
import { Input } from '../ui/input';
import { useFormContext } from 'react-hook-form';

const EmailNotificationSource = () => {
	const t = useTranslations();
	const form = useFormContext();
	return (
		<>
			<FormField
				control={form.control}
				name='email_source_form.host'
				render={({ field }) => (
					<FormItem>
						<div className='grid grid-cols-12'>
							<FormLabel className='col-span-3'>
								{t('notification_email_source_host_label')}
							</FormLabel>
							<FormControl>
								<Input
									{...field}
									className='col-span-9'
									placeholder={t('notification_email_source_host_placeholder')}
								/>
							</FormControl>
						</div>
						<FormMessage />
					</FormItem>
				)}
			/>
			<FormField
				control={form.control}
				name='email_source_form.port'
				render={({ field }) => (
					<FormItem>
						<div className='grid grid-cols-12'>
							<FormLabel className='col-span-3'>
								{t('notification_email_source_port_label')}
							</FormLabel>
							<FormControl>
								<Input
									type={'number'}
									{...field}
									className='col-span-9'
									placeholder={t('notification_email_source_port_placeholder')}
								/>
							</FormControl>
						</div>
						<FormMessage />
					</FormItem>
				)}
			/>
			<FormField
				control={form.control}
				name='email_source_form.username'
				render={({ field }) => (
					<FormItem>
						<div className='grid grid-cols-12'>
							<FormLabel className='col-span-3'>
								{t('notification_email_source_username_label')}
							</FormLabel>
							<FormControl>
								<Input
									{...field}
									className='col-span-9'
									placeholder={t(
										'notification_email_source_username_placeholder',
									)}
								/>
							</FormControl>
						</div>
						<FormMessage />
					</FormItem>
				)}
			/>
			<FormField
				control={form.control}
				name='email_source_form.password'
				render={({ field }) => (
					<FormItem>
						<div className='grid grid-cols-12'>
							<FormLabel className='col-span-3'>
								{t('notification_email_source_password_label')}
							</FormLabel>
							<FormControl>
								<Input
									type={'password'}
									{...field}
									className='col-span-9'
									placeholder={t(
										'notification_email_source_password_placeholder',
									)}
								/>
							</FormControl>
						</div>
						<FormMessage />
					</FormItem>
				)}
			/>
		</>
	);
};

export default EmailNotificationSource;
