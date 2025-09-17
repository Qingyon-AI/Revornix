import { useQuery } from '@tanstack/react-query';
import { useUserContext } from '@/provider/user-provider';
import { getSectionDetail } from '@/service/section';
import SectionConfiguration from './section-configuration';
import SectionDelete from './section-delete';
import SectionSubscribe from './section-subscribe';
import SectionShare from './section-share';

const SectionOperate = ({ id }: { id: number }) => {
	const { userInfo } = useUserContext();
	const { data: section } = useQuery({
		queryKey: ['getSectionDetail', id],
		queryFn: async () => {
			return getSectionDetail({ section_id: id });
		},
	});

	return (
		<div className='w-full flex justify-between'>
			{section && <SectionShare section_id={id} />}
			{section && userInfo?.id === section?.creator.id && (
				<>
					<SectionConfiguration section_id={id} className='flex-1 w-full' />
					<SectionDelete section_id={id} className='flex-1 w-full' />
				</>
			)}
			{section && userInfo?.id !== section?.creator.id && (
				<SectionSubscribe section_id={id} />
			)}
		</div>
	);
};

export default SectionOperate;
