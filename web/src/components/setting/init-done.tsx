import { CircleCheck } from 'lucide-react';

const InitDone = () => {
	return (
		<div className='bg-muted rounded p-5 py-12 flex flex-col justify-center items-center gap-2'>
			<CircleCheck className='size-28 text-muted-foreground' />
			<p>初始化配置已成功完成！</p>
		</div>
	);
};

export default InitDone;
