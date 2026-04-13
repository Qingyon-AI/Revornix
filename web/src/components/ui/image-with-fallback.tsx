'use client';

import {
	createContext,
	ImgHTMLAttributes,
	KeyboardEvent,
	PropsWithChildren,
	useContext,
	useEffect,
	useState,
} from 'react';
import { ChevronLeft, ChevronRight, ScanSearch, X } from 'lucide-react';
import { PhotoProvider, PhotoView } from 'react-photo-view';

import { cn } from '@/lib/utils';

import ImageLoadFailedSvg from './image-load-failed-svg';

const ImagePreviewGroupContext = createContext(false);

const PreviewOverlay = ({
	images,
	index,
	onIndexChange,
	onClose,
}: {
	images: { key: string | number }[];
	index: number;
	onIndexChange: (index: number) => void;
	onClose: () => void;
}) => {
	const total = images.length;
	const hasPrev = index > 0;
	const hasNext = index < total - 1;

	return (
		<div className='pointer-events-none absolute inset-0 z-[1000]'>
			<div className='flex items-start justify-between px-4 pb-0 pt-4 sm:px-6 sm:pt-6'>
				<div className='pointer-events-auto rounded-full bg-black/55 px-3 py-1.5 text-xs font-medium text-white shadow-sm backdrop-blur-sm sm:text-sm'>
					{index + 1} / {total}
				</div>
				<button
					type='button'
					aria-label='Close image preview'
					onClick={onClose}
					className='pointer-events-auto inline-flex size-10 items-center justify-center rounded-full bg-black/55 text-white shadow-sm backdrop-blur-sm transition-colors hover:bg-black/70'>
					<X className='size-4.5' />
				</button>
			</div>

			{total > 1 ? (
				<>
					<div className='absolute inset-y-0 left-0 flex items-center pl-3 sm:pl-4'>
						<button
							type='button'
							aria-label='Previous image'
							onClick={() => {
								if (hasPrev) {
									onIndexChange(index - 1);
								}
							}}
							disabled={!hasPrev}
							className='pointer-events-auto inline-flex size-11 items-center justify-center rounded-full bg-black/55 text-white shadow-sm backdrop-blur-sm transition-all hover:bg-black/70 disabled:cursor-not-allowed disabled:opacity-35'>
							<ChevronLeft className='size-5' />
						</button>
					</div>
					<div className='absolute inset-y-0 right-0 flex items-center pr-3 sm:pr-4'>
						<button
							type='button'
							aria-label='Next image'
							onClick={() => {
								if (hasNext) {
									onIndexChange(index + 1);
								}
							}}
							disabled={!hasNext}
							className='pointer-events-auto inline-flex size-11 items-center justify-center rounded-full bg-black/55 text-white shadow-sm backdrop-blur-sm transition-all hover:bg-black/70 disabled:cursor-not-allowed disabled:opacity-35'>
							<ChevronRight className='size-5' />
						</button>
					</div>
				</>
			) : null}
		</div>
	);
};

export const ImagePreviewGroup = ({
	children,
	maskOpacity = 0.88,
}: PropsWithChildren<{ maskOpacity?: number }>) => {
	return (
		<ImagePreviewGroupContext.Provider value>
			<PhotoProvider
				bannerVisible={false}
				maskOpacity={maskOpacity}
				photoClosable
				overlayRender={({ images, index, onIndexChange, onClose }) => (
					<PreviewOverlay
						images={images}
						index={index}
						onIndexChange={onIndexChange}
						onClose={() => onClose()}
					/>
				)}>
				{children}
			</PhotoProvider>
		</ImagePreviewGroupContext.Provider>
	);
};

type ImageWithFallbackProps = ImgHTMLAttributes<HTMLImageElement> & {
	containerClassName?: string;
	fallbackClassName?: string;
	fallbackSvgClassName?: string;
	preview?: boolean;
	maskOpacity?: number;
	previewTriggerClassName?: string;
};

const ImageWithFallback = ({
	src,
	alt,
	className,
	containerClassName,
	fallbackClassName,
	fallbackSvgClassName,
	preview = false,
	maskOpacity = 0.88,
	previewTriggerClassName,
	onError,
	...props
}: ImageWithFallbackProps) => {
	const [hasError, setHasError] = useState(false);
	const normalizedSrc = typeof src === 'string' ? src : '';
	const inPreviewGroup = useContext(ImagePreviewGroupContext);

	useEffect(() => {
		setHasError(false);
	}, [normalizedSrc]);

	const handlePreviewKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			event.currentTarget.click();
		}
	};

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

	const imageElement = (
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

	if (!preview) {
		return imageElement;
	}

	const previewTrigger = (
		<div
			role='button'
			tabIndex={0}
			aria-label={alt || 'Open image preview'}
			className={cn(
				'group relative block h-full w-full max-w-full cursor-zoom-in overflow-hidden [border-radius:inherit] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
				previewTriggerClassName,
			)}
			onKeyDown={handlePreviewKeyDown}>
			{imageElement}
			<span className='pointer-events-none absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/6 group-active:bg-black/10' />
			<span className='pointer-events-none absolute right-3 top-3 flex size-8 items-center justify-center rounded-full bg-black/55 text-white opacity-0 shadow-sm transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100'>
				<ScanSearch className='size-4' />
			</span>
		</div>
	);

	if (inPreviewGroup) {
		return <PhotoView src={normalizedSrc}>{previewTrigger}</PhotoView>;
	}

	return (
		<ImagePreviewGroup maskOpacity={maskOpacity}>
			<PhotoView src={normalizedSrc}>{previewTrigger}</PhotoView>
		</ImagePreviewGroup>
	);
};

export default ImageWithFallback;
