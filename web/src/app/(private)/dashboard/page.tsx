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
import { BookOpen, LayoutDashboard, Sparkles, Tags } from 'lucide-react';
import RandomClassicalPoem from '@/components/dashboard/random-classical-poem';
import CardTitleIcon from '@/components/ui/card-title-icon';

const DashboardPage = () => {
	const t = useTranslations();
	return (
		<div className='flex w-full flex-col gap-4 px-5 pb-5'>
			<InitSettingDialog />
			<div className='relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-background via-background to-emerald-500/5 p-4 shadow-[0_24px_60px_-34px_rgba(15,23,42,0.28)]'>
				<div className='pointer-events-none absolute inset-0'>
					<div className='absolute left-0 top-0 h-32 w-32 rounded-full bg-emerald-500/10 blur-3xl' />
					<div className='absolute right-6 top-6 h-24 w-24 rounded-full bg-sky-500/10 blur-3xl' />
				</div>
				<div className='relative flex flex-col gap-2.5 md:flex-row md:items-center md:justify-between'>
					<div className='flex items-center gap-3'>
						<div className='flex size-9 shrink-0 items-center justify-center rounded-xl bg-foreground text-background shadow-sm'>
							<LayoutDashboard className='size-4.5' />
						</div>
						<div className='space-y-1'>
							<div className='flex items-center gap-1.5 text-[11px] uppercase tracking-[0.22em] text-muted-foreground'>
								<Sparkles className='size-3' />
								<span>{t('website_title')}</span>
							</div>
							<h1 className='text-lg font-semibold tracking-tight md:text-xl'>
								{t('sidebar_dashboard')}
							</h1>
							<p className='max-w-2xl text-sm text-muted-foreground'>
								{t('website_description')}
							</p>
						</div>
					</div>
					<RandomClassicalPoem />
				</div>
			</div>
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
