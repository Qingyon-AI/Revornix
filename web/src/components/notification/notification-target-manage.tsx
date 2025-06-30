import Link from 'next/link';
import { Button } from '../ui/button';
import { useTranslations } from 'next-intl';

const NotificationTargetManage = () => {
	const t = useTranslations();
	return (
		<Link href={'/setting/notification/target-manage'}>
			<Button variant={'outline'}>
				{t('setting_notification_go_to_manage')}
			</Button>
		</Link>
	);
};

export default NotificationTargetManage;
