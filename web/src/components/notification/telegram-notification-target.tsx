import { FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Input } from '../ui/input';
import { useTranslations } from 'next-intl';
import { useFormContext } from 'react-hook-form';

const TelegramNotificationTarget = () => {
	const t = useTranslations();
	const form = useFormContext();

	return (
		<>
			<FormField
				control={form.control}
				name='telegram_target_form.chat_id'
				render={({ field }) => {
					return (
						<FormItem>
							<div className='grid grid-cols-12 gap-2'>
								<FormLabel className='col-span-3'>
									{t('notification_telegram_bind_chat_id_label')}
								</FormLabel>
								<Input
									className='col-span-9'
									{...field}
									placeholder={t(
										'notification_telegram_bind_chat_id_placeholder',
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

export default TelegramNotificationTarget;
