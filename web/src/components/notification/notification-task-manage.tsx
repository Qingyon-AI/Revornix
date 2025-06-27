import Link from 'next/link';
import { Button } from '../ui/button';

const NotificationTaskManage = () => {
	return (
		<Link href={'/setting/notification/task-manage'}>
			<Button variant={'outline'}>前往管理</Button>
		</Link>
	);
};

export default NotificationTaskManage;
