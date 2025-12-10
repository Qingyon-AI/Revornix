import { useQuery } from '@tanstack/react-query';
import { useUserContext } from '@/provider/user-provider';
import { getSectionDetail } from '@/service/section';
import SectionOperateConfiguration from './section-operate-configuration';
import SectionOperateDelete from './section-operate-delete';
import SectionOperateSubscribe from './section-operate-subscribe';
import SectionOperateShare from './section-operate-share';
import SectionOperateComment from './section-operate-comment';
import SectionDocument from './section-document';

const SectionOperate = ({ id }: { id: number }) => {
	const { mainUserInfo } = useUserContext();
	const { data: section } = useQuery({
		queryKey: ['getSectionDetail', id],
		queryFn: async () => {
			return getSectionDetail({ section_id: id });
		},
	});

	return (
		<div className='w-full flex justify-between'>
			<SectionOperateComment section_id={id} />
			<SectionDocument section_id={id} />
			{section && mainUserInfo?.id === section?.creator.id && (
				<>
					<SectionOperateShare section_id={id} />
					<SectionOperateConfiguration
						section_id={id}
						className='flex-1 w-full'
					/>
					<SectionOperateDelete section_id={id} className='flex-1 w-full' />
				</>
			)}
			{section && mainUserInfo?.id !== section?.creator.id && (
				<>
					<SectionOperateSubscribe section_id={id} className='flex-1 w-full' />
				</>
			)}
		</div>
	);
};

export default SectionOperate;
