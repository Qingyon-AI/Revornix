import { Card } from '../ui/card';
import { CirclePlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

const AddDocumentBox = () => {
	const t = useTranslations();
	return (
		<>
			<Link href={'/document/create'}>
				<Card className='p-5 m-5 md:m-0'>
					<div className='flex flex-col items-center justify-center gap-2 text-sm'>
						<CirclePlus />
						{t('sidebar_add_document')}
					</div>
				</Card>
			</Link>
		</>
	);
};
export default AddDocumentBox;
