import { useRouter } from 'nextjs-toploader/app';
import { Button } from '../ui/button';
import { useTranslations } from 'next-intl';

const MCPServerManage = () => {
	const t = useTranslations();
	const router = useRouter();
	return (
		<div>
			<Button variant={'outline'} onClick={() => router.push('/setting/mcp')}>
				{t('show_mcp_server_manage')}
			</Button>
		</div>
	);
};

export default MCPServerManage;
