import { FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Input } from '../ui/input';
import { useTranslations } from 'next-intl';
import { useFormContext } from 'react-hook-form';

const DingTalkNotificationTarget = () => {
	const t = useTranslations();
	const form = useFormContext();

	return (
		<>
			<FormField
				control={form.control}
				name='dingtalk_target_form.webhook_url'
				render={({ field }) => {
					return (
						<FormItem>
							<div className='grid grid-cols-12 gap-2'>
								<FormLabel className='col-span-3'>
									{t('notification_dingtalk_bind_webhook_url_label')}
								</FormLabel>
								<Input
									className='col-span-9'
									{...field}
									placeholder={t(
										'notification_dingtalk_bind_webhook_url_placeholder',
									)}
									value={field.value || ''}
								/>
							</div>
							<FormMessage />
						</FormItem>
					);
				}}
			/>
			<FormField
				control={form.control}
				name='dingtalk_target_form.sign'
				render={({ field }) => {
					return (
						<FormItem>
							<div className='grid grid-cols-12 gap-2'>
								<FormLabel className='col-span-3'>
									{t('notification_dingtalk_bind_signature_label')}
								</FormLabel>
								<Input
									className='col-span-9'
									{...field}
									placeholder={t(
										'notification_dingtalk_bind_signature_placeholder',
									)}
									value={field.value || ''}
								/>
							</div>
							<FormMessage />
						</FormItem>
					);
				}}
			/>
		</>
	);
};

export default DingTalkNotificationTarget;
