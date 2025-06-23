import Link from 'next/link';
import { Button } from '../ui/button';

const NotificationSourceManage = () => {
	return (
		<Link href={'/setting/notification/source-manage'}>
			<Button variant={'outline'}>通知源管理</Button>
		</Link>
	);
};

export default NotificationSourceManage;
