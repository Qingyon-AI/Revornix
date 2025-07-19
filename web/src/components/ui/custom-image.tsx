import { cn } from '@/lib/utils';
import React, { useState, useEffect } from 'react';

interface Props extends React.HTMLAttributes<HTMLImageElement> {
	src?: string | Blob;
	alt?: string;
	className?: string;
	errorPlaceHolder?: React.ReactNode;
	loadingPlaceholder?: React.ReactNode;
}

const CustomImage = (props: Props) => {
	const { src, alt, className, errorPlaceHolder, loadingPlaceholder, ...rest } =
		props;

	const [isLoaded, setIsLoaded] = useState(false);
	const [hasError, setHasError] = useState(false);

	useEffect(() => {
		setIsLoaded(false);
		setHasError(false);
	}, [src]);

	if (hasError && errorPlaceHolder) {
		return <>{errorPlaceHolder}</>;
	}

	return (
		<div className={cn('relative overflow-hidden', className)}>
			{/* 占位元素（加载中） */}
			{!isLoaded && !hasError && (
				<div className='absolute inset-0'>
					{loadingPlaceholder ?? (
						<div className='w-full h-full bg-gray-100 animate-pulse rounded' />
					)}
				</div>
			)}

			{/* 图片元素 */}
			<img
				src={`${process.env.NEXT_PUBLIC_FILE_API_PREFIX}/uploads/${src}`}
				alt={alt}
				className={cn(
					'w-full h-full object-cover',
					!isLoaded && 'opacity-0',
					'isLoaded && !hasError && "opacity-100 transition-opacity duration-300"',
				)}
				onLoad={() => setIsLoaded(true)}
				onError={() => setHasError(true)}
				{...rest}
			/>
		</div>
	);
};

export default CustomImage;
