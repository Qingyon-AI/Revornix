import { useFormContext } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import ImageUpload from '../ui/image-upload';
import { useTranslations } from 'next-intl';
import { getSectionCoverSrc } from '@/lib/section-cover';
import type { SectionInfo } from '@/generated';
import ImageWithFallback from '../ui/image-with-fallback';

const CoverUpdate = ({
	ownerId,
	section,
}: {
	ownerId?: number;
	section?: SectionInfo;
}) => {
	const t = useTranslations();
	const form = useFormContext();

	return (
		<FormField
			name='cover'
			control={form.control}
			render={({ field }) => {
				const currentCoverValue =
					typeof field.value === 'string' && field.value.length > 0
						? field.value
						: null;
				const coverPreviewSrc = currentCoverValue
					? getSectionCoverSrc({
							cover: currentCoverValue,
							creator: ownerId !== undefined ? { id: ownerId } : undefined,
					  })
					: getSectionCoverSrc(section);

				return (
					<FormItem className='rounded-2xl border border-border/60 bg-background/35 p-4'>
						<div className='flex flex-row items-center justify-between'>
							<FormLabel>{t('section_form_cover')}</FormLabel>
						</div>

						{coverPreviewSrc ? (
							<div className='overflow-hidden rounded-2xl border border-border/60 bg-background/55'>
								<ImageWithFallback
									alt='cover'
									src={coverPreviewSrc}
									preview
									className='aspect-[16/9] w-full object-cover'
								/>
							</div>
						) : null}

						<ImageUpload
							className={
								coverPreviewSrc
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
