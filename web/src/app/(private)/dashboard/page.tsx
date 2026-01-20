import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import UnReadDocumentBox from '@/components/dashboard/unread-documents-box';
import StarDocumentBox from '@/components/dashboard/star-document-box';
import RecentReadDocumentBox from '@/components/dashboard/recent-read-document-box';
import DocumentLabelsBox from '@/components/dashboard/document-labels-box';
import DocumentMonthSummary from '@/components/dashboard/document-month-summary';
import SectionLabelsBox from '@/components/dashboard/section-labels-box';
import { useTranslations } from 'next-intl';
import InitSettingDialog from '@/components/setting/init-setting-dialog';
import DocumentLabelSummary from '@/components/dashboard/document-label-summary';
import TodaySummary from '@/components/dashboard/today-summary';
import TodayNews from '@/components/dashboard/today-news';

const DashboardPage = () => {
	const t = useTranslations();
	return (
		<div className='flex flex-col px-5 gap-5 pb-5 w-full'>
			{/* <InitSettingDialog /> */}
			<div className='grid grid-cols-1 md:grid-cols-2 gap-5'>
				<TodaySummary />
				<TodayNews />
			</div>
			<div className='grid grid-cols-1 md:grid-cols-3 gap-5'>
				<UnReadDocumentBox />
				<StarDocumentBox />
				<RecentReadDocumentBox />
			</div>
			<div className='grid grid-cols-12 gap-5'>
				<DocumentMonthSummary className='col-span-12 md:col-span-8' />
				<DocumentLabelSummary className='col-span-12 md:col-span-4' />
			</div>
			<div className='grid grid-cols-1 md:grid-cols-2 gap-5'>
				<Card>
					<CardHeader>
						<CardTitle>
							<span>{t('document_label_collection_title')}</span>
						</CardTitle>
					</CardHeader>
					<CardContent className='flex flex-row gap-2 flex-wrap'>
						<DocumentLabelsBox />
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle>
							<span>{t('section_label_collection_title')}</span>
						</CardTitle>
					</CardHeader>
					<CardContent className='flex flex-row gap-2 flex-wrap'>
						<SectionLabelsBox />
					</CardContent>
				</Card>
			</div>
			<Card className='text-muted-foreground text-xs p-5 rounded-lg bg-card flex justify-center items-center shadow-none'>
				{t('dashboard_bottom_slogan')}
			</Card>
		</div>
	);
};

export default DashboardPage;
