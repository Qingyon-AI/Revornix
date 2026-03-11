import { DocumentInfo } from '@/generated';
import { useRouter } from 'nextjs-toploader/app';
import { replacePath } from '@/lib/utils';

const StackedDocuments = ({ documents }: { documents: DocumentInfo[] }) => {
	const router = useRouter();
	documents = documents.slice(0, 5);
	return (
		<div className='relative flex justify-center items-center'>
			<div className='relative h-32 w-full'>
				{documents &&
					documents.map((document, index) => (
						<div
							key={index}
							onClick={(e) => {
								e.stopPropagation();
								e.preventDefault();
								router.push(`/document/detail/${document.id}`);
							}}
							className={`
							bg-primary-foreground absolute inset-0 flex transform items-center justify-center rounded-xl p-4 shadow-sm ring-1 ring-inset ring-black/10 transition-all duration-300 ease-in-out dark:ring-white/10
						`}
							style={{
								zIndex: 10 - index,
								transform: `translateY(${index * 6}px) scale(${
									1 - index * 0.05
								})`,
							}}>
							<div className='flex w-full flex-1 flex-col gap-1.5'>
								<div className='text-sm font-bold line-clamp-1'>
									{document.title ? document.title : 'Untitled'}
								</div>
								<div className='text-sm line-clamp-3 text-muted-foreground'>
									{document.description
										? document.description
										: 'No description'}
								</div>
							</div>

							{document.cover && (
								<img
									className='ml-4 aspect-square h-full rounded-lg object-cover'
									src={replacePath(document.cover, document.creator_id)}
									alt='cover'
								/>
							)}
						</div>
					))}
			</div>
		</div>
	);
};

export default StackedDocuments;
