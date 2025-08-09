import { DocumentInfo } from '@/generated';
import { useRouter } from 'nextjs-toploader/app';
import React from 'react';
import CustomImage from '../ui/custom-image';

const StackedDocuments = ({ documents }: { documents: DocumentInfo[] }) => {
	const router = useRouter();
	documents = documents.slice(0, 5);
	return (
		<div className='relative flex justify-center items-center'>
			<div className='relative w-full h-24'>
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
							bg-primary-foreground absolute rounded inset-0 transform transition-all duration-300 ease-in-out shadow-sm ring-1 ring-inset dark:ring-white/10 ring-black/10 flex justify-center items-center p-5
						`}
							style={{
								zIndex: 10 - index,
								transform: `translateY(${index * 6}px) scale(${
									1 - index * 0.05
								})`,
							}}>
							<div className='flex flex-col gap-2 flex-1 mr-5'>
								<div className='text-sm font-bold line-clamp-1'>
									{document.title ? document.title : 'Untitled'}
								</div>
								<div className='text-sm line-clamp-2 text-muted-foreground'>
									{document.description ? document.description : 'No description'}
								</div>
							</div>

							{document.cover && (
								<CustomImage
									className='h-full aspect-square rounded object-cover'
									src={document.cover}
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
