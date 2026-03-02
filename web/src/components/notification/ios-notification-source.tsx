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

const IOSNotificationSource = ({ env }: { env: 'prod' | 'sandbox' }) => {
	const t = useTranslations();
	const form = useFormContext();
	return (
		<>
			<FormField
				control={form.control}
				name='ios_source_form.team_id'
				render={({ field }) => (
					<FormItem>
						<div className='grid grid-cols-12'>
							<FormLabel className='col-span-3'>
								{t('notification_ios_source_team_id_label')}
							</FormLabel>
							<FormControl>
								<Input
									{...field}
									className='col-span-9'
									placeholder={t('notification_ios_source_team_id_placeholder')}
								/>
							</FormControl>
						</div>
						<FormMessage />
					</FormItem>
				)}
			/>
			<FormField
				control={form.control}
				name='ios_source_form.key_id'
				render={({ field }) => (
					<FormItem>
						<div className='grid grid-cols-12'>
							<FormLabel className='col-span-3'>
								{t('notification_ios_source_key_id_label')}
							</FormLabel>
							<FormControl>
								<Input
									{...field}
									className='col-span-9'
									placeholder={t('notification_ios_source_key_id_placeholder')}
								/>
							</FormControl>
						</div>
						<FormMessage />
					</FormItem>
				)}
			/>
			<FormField
				control={form.control}
				name='ios_source_form.private_key'
				render={({ field }) => (
					<FormItem>
						<div className='grid grid-cols-12'>
							<FormLabel className='col-span-3'>
								{t('notification_ios_source_private_key_label')}
							</FormLabel>
							<FormControl>
								<Input
									{...field}
									className='col-span-9'
									placeholder={t(
										'notification_ios_source_private_key_placeholder',
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
				name='ios_source_form.apns_topic'
				render={({ field }) => (
					<FormItem>
						<div className='grid grid-cols-12'>
							<FormLabel className='col-span-3'>
								{t('notification_ios_source_apns_topic_label')}
							</FormLabel>
							<FormControl>
								<Input
									{...field}
									className='col-span-9'
									placeholder={t(
										'notification_ios_source_apns_topic_placeholder',
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

export default IOSNotificationSource;
