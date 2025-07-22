import { cn } from '@/lib/utils';
import React, { useState, useEffect } from 'react';

interface Props extends React.ImgHTMLAttributes<HTMLImageElement> {
	src?: string | Blob;
	errorPlaceHolder?: React.ReactNode;
	loadingPlaceholder?: React.ReactNode;
}

const CustomImage = (props: Props) => {
	const { src, alt, className, errorPlaceHolder, loadingPlaceholder, ...rest } =
		props;

	const [hasError, setHasError] = useState(false);
	const [finalSrc, setFinalSrc] = useState<string | undefined>(undefined);

	useEffect(() => {
		setHasError(false);

		let objectUrl: string | undefined;

		if (!src) {
			setFinalSrc(undefined);
			return;
		}

		if (src instanceof Blob) {
			objectUrl = URL.createObjectURL(src);
			setFinalSrc(objectUrl);
		} else if (typeof src === 'string') {
			setFinalSrc(src);
		}

		return () => {
			if (objectUrl) {
				URL.revokeObjectURL(objectUrl);
			}
		};
	}, [src]);

	const shouldShowImage = finalSrc && !hasError;

	return (
		<div className={cn('relative overflow-hidden', className)}>
			{shouldShowImage ? (
				<img
					key={finalSrc}
					src={finalSrc}
					alt={alt ?? ''}
					className='w-full h-full object-cover'
					onError={() => setHasError(true)}
					loading='lazy'
					{...rest}
				/>
			) : hasError && errorPlaceHolder ? (
				<>{errorPlaceHolder}</>
			) : loadingPlaceholder ? (
				<>{loadingPlaceholder}</>
			) : null}
		</div>
	);
};

export default CustomImage;
