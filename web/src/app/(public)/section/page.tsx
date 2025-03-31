'use client';

// import { useEffect, useState } from 'react';
// import { useGetState } from 'ahooks';
// import { toast } from 'sonner';
// import { PlusCircle } from 'lucide-react';
// import { Input } from '@/components/ui/input';
// import { Button } from '@/components/ui/button';
// import { Separator } from '@/components/ui/separator';
// import { searchMySection } from '@/service/section';
// import { useGetSet } from 'react-use';
// import { useInView } from 'react-intersection-observer';
// import SectionCard from '@/components/section/section-card';
// import SectionCardSkeleton from '@/components/section/section-card-skeleton';
// import SectionAddDialog from '@/components/section/section-add-dialog';

// interface Label {
// 	id: number;
// 	name: string;
// }

// interface User {
// 	id: number;
// 	nickname: string;
// }

// interface Section {
// 	id: number;
// 	title: string;
// 	cover: string;
// 	description: string;
// 	fork_num: number;
// 	comment_num: number;
// 	update_time: string;
// 	labels: Label[];
// 	users: User[];
// }

const SectionsPage = () => {
	// const [loading, setLoading] = useGetSet(false);
	// const [pageNum, setPageNum] = useGetSet(0);
	// const [pageSize, setPageSize] = useState(10);
	// const [keyword, setKeyword] = useState('');
	// const [hasMore, setHasMore] = useGetSet(true);
	// const [sections, setSections] = useGetState<Section[]>([]);

	// const [showAddDialog, setShowAddDialog] = useGetState(false);

	// const { ref: bottomRef, inView } = useInView();

	// const onLoadNextPage = async () => {
	// 	setLoading(true);
	// 	const [res, err] = await searchMySection(keyword, pageNum() + 1, pageSize);
	// 	if (err) {
	// 		toast.error(err.message);
	// 		setLoading(false);
	// 		return;
	// 	}
	// 	setSections((prev) => [...(prev ? prev : []), ...res.elements]);
	// 	setPageNum(pageNum() + 1);
	// 	// 注意 hasMore的设置必须要在pageNum的设置的后面，否则会导致额外一次请求！
	// 	setHasMore(res.total_pages > pageNum());
	// 	setLoading(false);
	// };

	// const onSearch = () => {
	// 	setPageNum(0);
	// 	setSections([]);
	// 	setHasMore(true);
	// 	onLoadNextPage();
	// };

	// useEffect(() => {
	// 	inView && hasMore() && !loading() && onLoadNextPage();
	// }, [inView]);

	return (
		<>
			{/* <SectionAddDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
			<div className='px-5 pb-5 flex flex-col gap-5 h-full'>
				<div className='flex justify-between items-center gap-5'>
					<div className='flex flex-row items-center gap-5'>
						<Input
							className='ring-inset'
							placeholder='搜索专栏'
							value={keyword}
							onChange={(e) => setKeyword(e.target.value)}
						/>
						<Button type='button' onClick={onSearch}>
							搜索
						</Button>
					</div>
					<Button onClick={() => setShowAddDialog(true)}>
						增加专栏
						<PlusCircle />
					</Button>
				</div>
				<Separator />
				<div className='overflow-auto' style={{ flex: '1 1 0' }}>
					<div className='grid grid-cols-1 md:grid-cols-4 gap-5 '>
						{sections.map((section, index) => {
							return <SectionCard key={index} section={section} />;
						})}
						{loading() && hasMore() && (
							<>
								{[...Array(8)].map((number, index) => {
									return <SectionCardSkeleton key={index} />;
								})}
							</>
						)}
					</div>
					<div ref={bottomRef}></div>
				</div>
			</div> */}
		</>
	);
};

export default SectionsPage;
