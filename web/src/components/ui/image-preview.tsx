'use client';

import { KeyboardEvent, useEffect, useState } from 'react';
import { ScanSearch } from 'lucide-react';
import { PhotoProvider, PhotoView } from 'react-photo-view';

import { cn } from '@/lib/utils';
import ImageLoadFailedSvg from './image-load-failed-svg';

type ImagePreviewProps = {
	src: string;
	alt?: string;
	className?: string;
	imageClassName?: string;
	maskOpacity?: number;
};

const ImagePreview = ({
	src,
	alt,
	className,
	imageClassName,
	maskOpacity = 0.88,
}: ImagePreviewProps) => {
	const [hasError, setHasError] = useState(false);

	useEffect(() => {
		setHasError(false);
	}, [src]);

	const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			event.currentTarget.click();
		}
	};

	if (!src || hasError) {
		return (
			<div
				className={cn(
					'flex items-center justify-center overflow-hidden rounded-[inherit] bg-muted/20 text-muted-foreground',
					className,
					imageClassName,
				)}>
				<div className='flex flex-col items-center justify-center gap-2 px-6 py-6 text-center'>
					<ImageLoadFailedSvg className='h-full w-full max-w-[240px]' />
					<p className='text-sm text-muted-foreground/80'>图片加载失败</p>
				</div>
			</div>
		);
	}

	return (
		<PhotoProvider
			maskOpacity={maskOpacity}
			bannerVisible={false}
			photoClosable>
			<PhotoView src={src}>
				<button
					type='button'
					aria-label={alt || 'Open image preview'}
					className={cn(
						'group relative block cursor-zoom-in overflow-hidden [border-radius:inherit] border-0 bg-transparent p-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
						className,
					)}
					onKeyDown={handleKeyDown}>
					<img
						src={src}
						alt={alt || 'image'}
						className={cn(
							'transition-transform duration-300 ease-out group-hover:scale-[1.015]',
							imageClassName,
						)}
						onError={() => setHasError(true)}
					/>
					<span className='pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/6 group-active:bg-black/10' />
					<span className='pointer-events-none absolute right-3 top-3 flex size-8 items-center justify-center rounded-full bg-black/55 text-white opacity-0 shadow-sm transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100'>
						<ScanSearch className='size-4' />
					</span>
				</button>
			</PhotoView>
		</PhotoProvider>
	);
};

export default ImagePreview;
