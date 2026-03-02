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

const TelegramNotificationSource = () => {
	const t = useTranslations();
	const form = useFormContext();
	return (
		<>
			<FormField
				control={form.control}
				name='telegram_source_form.bot_token'
				render={({ field }) => (
					<FormItem>
						<div className='grid grid-cols-12'>
							<FormLabel className='col-span-3'>
								{t('notification_telegram_source_bot_token_label')}
							</FormLabel>
							<FormControl>
								<Input
									{...field}
									className='col-span-9'
									placeholder={t(
										'notification_telegram_source_bot_token_placeholder',
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

export default TelegramNotificationSource;
