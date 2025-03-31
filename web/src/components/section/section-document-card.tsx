import { SectionDocumentInfo } from '@/generated';
import { format } from 'date-fns';
import { useRouter } from 'nextjs-toploader/app';

const SectionDocumentCard = ({
	document,
}: {
	document: SectionDocumentInfo;
}) => {
	const router = useRouter();
	return (
		<div
			onClick={() => router.push(`/document/detail/${document.id}`)}
			className='relative bg-white dark:bg-black rounded ring-1 ring-inset dark:ring-white/10 ring-black/10 flex justify-between items-center p-5'>
			<div className='flex flex-col gap-2'>
				<div className='text-sm font-bold line-clamp-1'>
					{document.title ? document.title : '无标题'}
				</div>
				<div className='text-xs text-muted-foreground line-clamp-2'>
					{document.description ? document.description : '无描述'}
				</div>
				<div className='flex flex-row items-center gap-2 overflow-auto'>
					<div className='w-fit text-xs text-muted-foreground px-2 py-1 rounded bg-muted'>
						文档类型：
						{document.category === 1
							? '网站'
							: document.category === 0
							? '文件'
							: document.category === 2
							? '速记'
							: '其他'}
					</div>
					<div className='w-fit text-xs text-muted-foreground px-2 py-1 rounded bg-muted'>
						专栏补充状态：
						{document.status === 0
							? '待补充'
							: document.status === 1
							? '补充中'
							: document.status === 2
							? '补充完成'
							: document.status === 3
							? '补充失败'
							: '未知状态'}
					</div>
				</div>

				{document.labels && document.labels.length > 0 && (
					<div className='flex flex-row gap-3 items-center'>
						{document.labels?.map((label, index) => {
							return (
								<div
									key={index}
									className='w-fit text-xs text-muted-foreground px-2 py-1 rounded bg-muted'>
									{label.name}
								</div>
							);
						})}
					</div>
				)}
				<div className='text-xs text-muted-foreground'>
					{document.create_time &&
						format(new Date(document.create_time), 'yyyy-MM-dd HH:mm:ss')}
				</div>
			</div>
			{document.cover && (
				<img
					src={document.cover}
					alt='cover'
					className='relative h-12 aspect-square rounded overflow-hidden shrink-0 object-cover'
				/>
			)}
		</div>
	);
};

export default SectionDocumentCard;
