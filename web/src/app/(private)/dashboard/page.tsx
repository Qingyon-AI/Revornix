import type { Metadata } from 'next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import UnReadDocumentBox from '@/components/dashboard/unread-documents-box';
import StarDocumentBox from '@/components/dashboard/star-document-box';
import RecentReadDocumentBox from '@/components/dashboard/recent-read-document-box';
import DocumentLabelsBox from '@/components/dashboard/document-labels-box';
import DocumentMonthSummary from '@/components/dashboard/document-month-summary';
import SectionLabelsBox from '@/components/dashboard/section-labels-box';
import { useTranslations } from 'next-intl';
import DocumentLabelSummary from '@/components/dashboard/document-label-summary';
import TodaySummary from '@/components/dashboard/today-summary';
import TodayNews from '@/components/dashboard/today-news';
import { BookOpen, Tags } from 'lucide-react';
import DashboardHero from '@/components/dashboard/dashboard-hero';
import CardTitleIcon from '@/components/ui/card-title-icon';
import InitSettingDialog from '@/components/setting/init-setting-dialog';
import { buildNoIndexAppMetadata } from '@/lib/seo-metadata';

export const metadata: Metadata = buildNoIndexAppMetadata(
	'Dashboard',
	'Your Revornix dashboard for daily knowledge activity, summaries, and quick access.',
);

const DashboardPage = () => {
	const t = useTranslations();
	return (
		<div className='flex w-full flex-col gap-5 px-5 pb-5'>
			<DashboardHero />
			<InitSettingDialog showAlert />
			<div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
				<TodaySummary />
				<TodayNews />
			</div>
			<div className='grid grid-cols-1 gap-4 md:grid-cols-3'>
				<UnReadDocumentBox />
				<StarDocumentBox />
				<RecentReadDocumentBox />
			</div>
			<div className='grid grid-cols-12 gap-4'>
				<DocumentMonthSummary className='col-span-12 md:col-span-8' />
				<DocumentLabelSummary className='col-span-12 md:col-span-4' />
			</div>
			<div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
				<Card className='rounded-2xl border border-border/60 bg-card/80 shadow-sm backdrop-blur-sm'>
					<CardHeader>
						<CardTitle className='flex items-center gap-3'>
							<CardTitleIcon icon={Tags} tone='sky' />
							<span>{t('document_label_collection_title')}</span>
						</CardTitle>
					</CardHeader>
					<CardContent className='flex flex-row gap-2 flex-wrap'>
						<DocumentLabelsBox />
					</CardContent>
				</Card>
				<Card className='rounded-2xl border border-border/60 bg-card/80 shadow-sm backdrop-blur-sm'>
					<CardHeader>
						<CardTitle className='flex items-center gap-3'>
							<CardTitleIcon icon={BookOpen} tone='emerald' />
							<span>{t('section_label_collection_title')}</span>
						</CardTitle>
					</CardHeader>
					<CardContent className='flex flex-row gap-2 flex-wrap'>
						<SectionLabelsBox />
					</CardContent>
				</Card>
			</div>
		</div>
	);
};

export default DashboardPage;
