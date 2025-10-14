import { Card } from '../ui/card';
import { Button } from '../ui/button';
import SectionOperateSubscribe from './section-operate-subscribe';
import { useRouter } from 'nextjs-toploader/app';
import { useQuery } from '@tanstack/react-query';
import { getSectionDetail } from '@/service/section';
import CustomImage from '../ui/custom-image';

const NeedPaySectionDialog = ({ id }: { id: number }) => {
	const router = useRouter();
	const { data: section } = useQuery({
		queryKey: ['getSectionDetail', id],
		queryFn: async () => {
			return getSectionDetail({ section_id: id });
		},
	});
	return (
		<>
			{section && (
				<div className='flex justify-center items-center h-full w-full'>
					<Card className='pt-0 w-[500px] overflow-auto gap-5'>
						{section?.cover && (
							<CustomImage
								src={section.cover}
								alt='cover'
								className='w-full h-36 object-cover'
							/>
						)}
						<div className='flex flex-col gap-2'>
							<p className='px-5 font-bold'>{section.title}</p>
							<p className='px-5 text-sm'>{section.description}</p>
						</div>
						<div className='flex flex-row gap-5 px-5 text-sm'>
							<div className='flex-1 flex justify-center items-center bg-muted py-2 rounded'>
								当前订阅人数
								<span className='font-bold px-1'>
									{section.subscribers_count}
								</span>
							</div>
							<div className='flex-1 flex justify-center items-center bg-muted py-2 rounded'>
								当前文档总数
								<span className='font-bold px-1'>
									{section.documents_count}
								</span>
							</div>
						</div>
						<p className='px-5 text-xs text-center text-muted-foreground'>
							该专栏是收费专栏，您需要付费订阅后才能查看
						</p>
						<div className='px-5 w-full flex flex-row gap-5 justify-end items-center'>
							<Button
								variant={'secondary'}
								className='text-xs'
								onClick={() => router.back()}>
								返回上级
							</Button>
							<SectionOperateSubscribe section_id={section.id} />
						</div>
					</Card>
				</div>
			)}
		</>
	);
};
export default NeedPaySectionDialog;
