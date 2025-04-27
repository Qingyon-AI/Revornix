import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import UnReadDocumentBox from '@/components/document/unread-documents-box';
import StarDocumentBox from '@/components/document/star-document-box';
import RecentReadDocumentBox from '@/components/document/recent-read-document-box';
import DocumentLabelsBox from '@/components/document/document-labels-box';
import DocumentMonthSummary from '@/components/document/document-month-summary';
import SectionLabelsBox from '@/components/document/section-labels-box';
import { useTranslations } from 'next-intl';

const DashboardPage = () => {
	const t = useTranslations();
	return (
		<div className='flex flex-col px-5 gap-5 pb-5 w-full'>
			<DocumentMonthSummary />
			<div className='grid grid-cols-1 md:grid-cols-3 gap-5'>
				<UnReadDocumentBox />
				<StarDocumentBox />
				<RecentReadDocumentBox />
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
			<div className='text-muted-foreground text-xs p-5 rounded-lg bg-muted flex justify-center items-center'>
				{t('dashboard_bottom_slogan')}
			</div>
		</div>
	);
};

export default DashboardPage;
