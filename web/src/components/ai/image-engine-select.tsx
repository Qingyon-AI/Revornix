'use client';

import { EngineCategory } from '@/enums/engine';
import EngineSelect from './engine-select';

type Props = {
	value?: number | null;
	onChange: (id: number) => void;
	disabled?: boolean;
	className?: string;
	placeholder?: string;
};

const ImageEngineSelect = (props: Props) => (
	<EngineSelect {...props} category={EngineCategory.IMAGE_GENERATE} />
);

export default ImageEngineSelect;
