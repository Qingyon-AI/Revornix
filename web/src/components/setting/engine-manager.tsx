import Link from 'next/link';
import { Button } from '../ui/button';

const EngineManager = () => {
	return (
		<Link href={'/setting/engine'}>
			<Button variant={'outline'}>前往管理引擎</Button>
		</Link>
	);
};

export default EngineManager;
