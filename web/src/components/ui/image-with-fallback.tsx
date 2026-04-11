'use client';

import { ImgHTMLAttributes, useEffect, useState } from 'react';

import { cn } from '@/lib/utils';

import ImageLoadFailedSvg from './image-load-failed-svg';

type ImageWithFallbackProps = ImgHTMLAttributes<HTMLImageElement> & {
	containerClassName?: string;
	fallbackClassName?: string;
	fallbackSvgClassName?: string;
};

const ImageWithFallback = ({
	src,
	alt,
	className,
	containerClassName,
	fallbackClassName,
	fallbackSvgClassName,
	onError,
	...props
}: ImageWithFallbackProps) => {
	const [hasError, setHasError] = useState(false);
	const normalizedSrc = typeof src === 'string' ? src : '';

	useEffect(() => {
		setHasError(false);
	}, [normalizedSrc]);

	if (!normalizedSrc || hasError) {
		return (
			<div
				className={cn(
					'flex items-center justify-center overflow-hidden bg-muted/20 text-muted-foreground',
					containerClassName,
					className,
					fallbackClassName,
				)}>
				<div className='flex flex-col items-center justify-center gap-2 px-5 py-5 text-center'>
					<ImageLoadFailedSvg
						className={cn('h-full w-full max-w-[240px]', fallbackSvgClassName)}
					/>
					<p className='text-sm text-muted-foreground/80'>图片加载失败</p>
				</div>
			</div>
		);
	}

	return (
		<img
			{...props}
			src={normalizedSrc}
			alt={alt}
			className={className}
			onError={(event) => {
				setHasError(true);
				onError?.(event);
			}}
		/>
	);
};

export default ImageWithFallback;
