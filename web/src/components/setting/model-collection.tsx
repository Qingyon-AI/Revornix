import { useRouter } from 'nextjs-toploader/app';
import { Button } from '../ui/button';

const ModelCollection = () => {
	const router = useRouter();
	return (
		<Button variant='outline' onClick={() => router.push('/setting/model')}>
			模型配置
		</Button>
	);
};

export default ModelCollection;
