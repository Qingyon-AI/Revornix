import { useRouter } from 'nextjs-toploader/app';
import { Button } from '../ui/button';

const MCPServerManage = () => {
	const router = useRouter();
	return (
		<div>
			<Button
				variant={'outline'}
				onClick={() => router.push('/setting/mcp')}>
				打开MCP配置
			</Button>
		</div>
	);
};

export default MCPServerManage;
