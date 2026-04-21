'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

import SectionCommentForm from '@/components/section/section-comment-form';
import { Button } from '@/components/ui/button';
import { useUserContext } from '@/provider/user-provider';

type SeoSectionCommentGateProps = {
	sectionId: number;
	loginHref: string;
};

const SeoSectionCommentGate = ({
	sectionId,
	loginHref,
}: SeoSectionCommentGateProps) => {
	const t = useTranslations();
	const { mainUserInfo } = useUserContext();

	if (mainUserInfo) {
		return <SectionCommentForm section_id={sectionId} />;
	}

	return (
		<div className='rounded-[24px] border border-dashed border-border/70 bg-muted/20 px-4 py-4 text-sm text-muted-foreground'>
			<div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
				<span>{t('seo_section_login_to_comment')}</span>
				<Link href={loginHref}>
					<Button size='sm' className='rounded-2xl'>
						{t('seo_nav_login_in')}
					</Button>
				</Link>
			</div>
		</div>
	);
};

export default SeoSectionCommentGate;
