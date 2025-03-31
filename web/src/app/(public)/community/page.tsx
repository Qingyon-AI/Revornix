'use client';

// import Image from 'next/image';
// import { useRouter } from 'nextjs-toploader/app';
// import { useEffect, useState } from 'react';

// import resolveConfig from 'tailwindcss/resolveConfig';
// import tailwindConfig from 'tailwind.config.ts';
// import { useGetSet } from 'react-use';
// import { useInView } from 'react-intersection-observer';
// import { searchSection } from '@/service/section';
// import { toast } from 'sonner';
// import SectionCard from '@/components/section/section-card';
// import SectionCardSkeleton from '@/components/section/section-card-skeleton';

// const fullConfig = resolveConfig(tailwindConfig);

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

const CommunityPage = () => {
	// const router = useRouter();

	// const [loading, setLoading] = useGetSet(false);
	// const [pageNum, setPageNum] = useGetSet(0);
	// const [pageSize, setPageSize] = useState(10);
	// const [keyword, setKeyword] = useState('');
	// const [hasMore, setHasMore] = useGetSet(true);
	// const [sections, setSections] = useGetSet<Section[]>([]);
	// const [rows, setRows] = useGetSet<Section[][]>([]);

	// const { ref: bottomRef, inView } = useInView();

	// const onLoadNextPage = async () => {
	// 	setLoading(true);
	// 	const [res, err] = await searchSection(keyword, pageNum() + 1, pageSize);
	// 	if (err) {
	// 		toast.error(err.message);
	// 		setLoading(false);
	// 		return;
	// 	}
	// 	setSections((prev) => [...(prev ? prev : []), ...res.elements]);
	// 	let tempSections = [...sections()];
	// 	const rows: Section[][] = [];
	// 	while (tempSections.length > 0) {
	// 		// 判断屏幕宽度
	// 		const isSmallScreen =
	// 			window.innerWidth <=
	// 			Number(fullConfig.theme.screens.md.replace(/px/, ''));
	// 		const count = isSmallScreen ? 1 : Math.ceil(Math.random() * 4); // 小屏幕固定1列
	// 		rows.push(tempSections.splice(0, count));
	// 	}
	// 	setRows(rows);
	// 	setPageNum(pageNum() + 1);
	// 	// 注意 hasMore的设置必须要在pageNum的设置的后面，否则会导致额外一次请求！
	// 	setHasMore(res.total_pages > pageNum());
	// 	setLoading(false);
	// };

	// useEffect(() => {
	// 	inView && hasMore() && !loading() && onLoadNextPage();
	// }, [inView]);

	return (
		<div className='px-5 pb-5 flex flex-col gap-5'>
			{/* {rows().map((row, rowIndex) => (
				<div
					key={rowIndex}
					className='grid gap-5'
					style={{
						gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))`,
					}}>
					{row.map((section, index) => (
						<SectionCard key={index} section={section} />
					))}
				</div>
			))}
			{loading() && hasMore() && (
				<>
					<div className='grid gap-5 grid-cols-3'>
						{[...Array(3)].map((number, index) => {
							return <SectionCardSkeleton key={index} />;
						})}
					</div>
					<div className='grid gap-5 grid-cols-2'>
						{[...Array(2)].map((number, index) => {
							return <SectionCardSkeleton key={index} />;
						})}
					</div>
				</>
			)}
			<div ref={bottomRef}></div> */}
		</div>
	);
};

export default CommunityPage;
