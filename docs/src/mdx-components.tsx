import type { ComponentType, ImgHTMLAttributes } from 'react';
import { useMDXComponents as getThemeComponents } from 'nextra-theme-docs'; // nextra-theme-blog or your custom theme

// Get the default MDX components
const themeComponents = getThemeComponents();

const MdxImage = (props: ImgHTMLAttributes<HTMLImageElement>) => {
	return (
		<img
			{...props}
			alt={props.alt ?? ''}
			loading={props.loading ?? 'lazy'}
			className={props.className}
		/>
	);
};

// Merge components
export const useMDXComponents = (
	components?: Record<string, ComponentType>
) => {
	return {
		...themeComponents,
		img: MdxImage,
		...components,
	};
};
