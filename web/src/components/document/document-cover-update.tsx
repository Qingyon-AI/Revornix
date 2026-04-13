import { useFormContext } from 'react-hook-form';
import { useTranslations } from 'next-intl';

import { replacePath } from '@/lib/utils';

import { FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import ImageWithFallback from '../ui/image-with-fallback';
import ImageUpload from '../ui/image-upload';

const DocumentCoverUpdate = ({ ownerId }: { ownerId?: number }) => {
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
				const currentCoverSrc = currentCover
					? ownerId
						? replacePath(currentCover, ownerId)
						: currentCover
					: null;

				return (
					<FormItem className='rounded-2xl border border-border/60 bg-background/35 p-4'>
						<div className='flex flex-row items-center justify-between'>
							<FormLabel>{t('document_configuration_form_cover')}</FormLabel>
						</div>

						{currentCoverSrc ? (
							<div className='overflow-hidden rounded-2xl border border-border/60 bg-background/55'>
								<ImageWithFallback
									alt='cover'
									src={currentCoverSrc}
									preview
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
								field.onChange(null);
							}}
						/>

						<FormMessage />
					</FormItem>
				);
			}}
		/>
	);
};

export default DocumentCoverUpdate;
