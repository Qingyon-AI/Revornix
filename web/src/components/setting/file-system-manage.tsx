import { useTranslations } from 'next-intl';
import { Button } from '../ui/button';
import Link from 'next/link';

const FileSystemManage = () => {
	const t = useTranslations();
	return (
		<Link href={'/setting/file-system'}>
			<Button variant={'outline'}>
				{t('setting_file_system_manage_goto')}
			</Button>
		</Link>
	);
};

export default FileSystemManage;
