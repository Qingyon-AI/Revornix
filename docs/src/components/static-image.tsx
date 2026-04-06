import type { ImgHTMLAttributes } from 'react';

const StaticImage = (props: ImgHTMLAttributes<HTMLImageElement>) => {
	return (
		<img
			{...props}
			alt={props.alt ?? ''}
			loading={props.loading ?? 'lazy'}
		/>
	);
};

export default StaticImage;
