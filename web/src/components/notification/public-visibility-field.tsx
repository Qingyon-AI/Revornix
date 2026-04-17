'use client';

import { FormItem } from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

type Props = {
	label: string;
	description: string;
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
	disabled?: boolean;
};

const PublicVisibilityField = ({
	label,
	description,
	checked,
	onCheckedChange,
	disabled = false,
}: Props) => {
	return (
		<FormItem className='rounded-xl border border-input/70 bg-background/60 p-4'>
			<div className='flex flex-row items-center justify-between gap-3'>
				<div className='space-y-1'>
					<Label className='flex flex-row items-center gap-1 text-sm font-medium'>
						{label}
					</Label>
					<p className='text-xs leading-5 text-muted-foreground'>
						{description}
					</p>
				</div>
				<Switch
					disabled={disabled}
					checked={checked}
					onCheckedChange={onCheckedChange}
				/>
			</div>
		</FormItem>
	);
};

export default PublicVisibilityField;
