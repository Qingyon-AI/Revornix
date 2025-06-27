import Link from 'next/link';
import { Button } from '../ui/button';

const NotificationTargetManage = () => {
	return (
		<Link href={'/setting/notification/target-manage'}>
			<Button variant={'outline'}>前往管理</Button>
		</Link>
	);
};

export default NotificationTargetManage;
