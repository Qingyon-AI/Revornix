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

const FeiShuNotificationSource = () => {
	const t = useTranslations();
	const form = useFormContext();
	return (
		<>
			<FormField
				control={form.control}
				name='feishu_source_form.app_id'
				render={({ field }) => (
					<FormItem>
						<div className='grid grid-cols-12'>
							<FormLabel className='col-span-3'>
								{t('notification_feishu_source_app_id_label')}
							</FormLabel>
							<FormControl>
								<Input
									{...field}
									className='col-span-9'
									placeholder={t('notification_feishu_source_app_id_placeholder')}
								/>
							</FormControl>
						</div>
						<FormMessage />
					</FormItem>
				)}
			/>
			<FormField
				control={form.control}
				name='feishu_source_form.app_secret'
				render={({ field }) => (
					<FormItem>
						<div className='grid grid-cols-12'>
							<FormLabel className='col-span-3'>
								{t('notification_feishu_source_app_secret_label')}
							</FormLabel>
							<FormControl>
								<Input
									{...field}
									className='col-span-9'
									placeholder={t(
										'notification_feishu_source_app_secret_placeholder',
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

export default FeiShuNotificationSource;
