import { ReferenceItem } from '@/store/ai-chat';
import { Card } from '../ui/card';

const SearchResultsRef = ({ references }: { references: ReferenceItem[] }) => {
	return (
		<div>
			<p className='font-bold'>搜索到的相关网站</p>
			<div className='w-full grid grid-flow-col gap-3 overflow-auto h-fit'>
				{references?.map((item, index) => {
					return (
						<Card
							key={index}
							className='w-80 shrink-0 gap-2 dark:bg-black/50 bg-white/50 p-3'
							onClick={() => window.open(item.url, '_blank')}>
							<p className='line-clamp-2 text-sm !m-0'>{item.title}</p>
							<p className='line-clamp-2 !m-0 text-xs text-muted-foreground'>
								{item.site_name}
							</p>
							<div className='flex-1 !m-0'></div>
							<p className='line-clamp-2 text-sm text-muted-foreground !m-0'>
								{item.summary}
							</p>
						</Card>
					);
				})}
			</div>
		</div>
	);
};

export default SearchResultsRef;
