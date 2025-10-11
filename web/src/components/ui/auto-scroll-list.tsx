// components/ui/auto-scroll-list.tsx
'use client';

import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';

interface AutoScrollListProps {
	children: ReactNode[];
	visibleCount?: number; // 同时显示的条数
	itemHeight?: number; // 每条高度(px)
	interval?: number; // 滚动间隔(ms)
	gap?: number; // 每条之间的间距(px)
	className?: string;
}

export const AutoScrollList = ({
	children,
	visibleCount = 3,
	itemHeight = 36, // ✅ 改小行高（默认 36px）
	interval = 3000,
	gap = 2, // ✅ 默认间距 2px
	className = '',
}: AutoScrollListProps) => {
	const [currentIndex, setCurrentIndex] = useState(0);
	const intervalRef = useRef<NodeJS.Timeout | null>(null);
	const totalItems = children.length;

	// 扩展内容以实现循环滚动
	const extendedChildren = [...children, ...children.slice(0, visibleCount)];

	const startScroll = useCallback(() => {
		if (intervalRef.current || totalItems === 0) return;
		intervalRef.current = setInterval(() => {
			setCurrentIndex((prev) => (prev + 1) % totalItems);
		}, interval);
	}, [interval, totalItems]);

	const stopScroll = useCallback(() => {
		if (intervalRef.current) {
			clearInterval(intervalRef.current);
			intervalRef.current = null;
		}
	}, []);

	useEffect(() => {
		startScroll();
		const handleVisibilityChange = () => {
			if (document.visibilityState === 'hidden') stopScroll();
			else if (document.visibilityState === 'visible') startScroll();
		};
		document.addEventListener('visibilitychange', handleVisibilityChange);
		return () => {
			stopScroll();
			document.removeEventListener('visibilitychange', handleVisibilityChange);
		};
	}, [startScroll, stopScroll]);

	return (
		<div
			className={`relative overflow-hidden ${className}`}
			style={{
				height: `${visibleCount * (itemHeight + gap)}px`,
			}}
			onMouseEnter={stopScroll}
			onMouseLeave={startScroll}
		>
			<div
				className='transition-transform duration-700 ease-in-out'
				style={{
					transform: `translateY(-${currentIndex * (itemHeight + gap)}px)`,
				}}
			>
				{extendedChildren.map((child, index) => (
					<div
						key={index}
						style={{
							height: itemHeight,
							marginBottom: gap, // ✅ 添加间距而不是 border
						}}
						className='flex items-center'
					>
						{child}
					</div>
				))}
			</div>
		</div>
	);
};