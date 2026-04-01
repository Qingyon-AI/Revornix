import { useFormContext } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import ImageUpload from '../ui/image-upload';
import { useTranslations } from 'next-intl';
import { replacePath } from '@/lib/utils';

const CoverUpdate = ({ ownerId }: { ownerId?: number }) => {
	const t = useTranslations();
	const form = useFormContext();

	return (
		<FormField
			name='cover'
			control={form.control}
			render={({ field }) => {
				const currentCover =
					typeof field.value === 'string' && field.value.length > 0
						? field.value
						: null;

				return (
					<FormItem className='rounded-2xl border border-border/60 bg-background/35 p-4'>
						<div className='flex flex-row items-center justify-between'>
							<FormLabel>{t('section_form_cover')}</FormLabel>
						</div>

						{currentCover && ownerId ? (
							<div className='overflow-hidden rounded-2xl border border-border/60 bg-background/55'>
								<img
									alt='cover'
									src={replacePath(currentCover, ownerId)}
									className='aspect-[16/9] w-full object-cover'
								/>
							</div>
						) : null}

						<ImageUpload
							className={
								currentCover
									? 'h-24 rounded-2xl border-dashed bg-background/55'
									: 'h-40 rounded-2xl border-dashed bg-background/55'
							}
							onSuccess={(fileName) => {
								field.onChange(fileName);
							}}
							onDelete={() => {
								field.onChange(undefined);
							}}
						/>

						<FormMessage />
					</FormItem>
				);
			}}
		/>
	);
};

export default CoverUpdate;
