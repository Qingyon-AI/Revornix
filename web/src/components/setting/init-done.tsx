import { Button } from '../ui/button';
import { DrawerClose } from '../ui/drawer';

const InitDone = () => {
	return (
		<div className='space-y-5 text-center pb-5'>
			<h2 className='font-bold text-lg'>恭喜！</h2>
			<div className='w-full p-5 bg-muted'>初始化配置已成功完成！</div>
			<DrawerClose asChild>
				<Button className='w-full'>确认完成</Button>
			</DrawerClose>
		</div>
	);
};

export default InitDone;
