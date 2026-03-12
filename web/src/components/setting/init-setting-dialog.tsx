'use client';

import Link from 'next/link';
import { useMemo, useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
	ArrowRight,
	BookOpenText,
	Bot,
	CheckCircle2,
	CircleAlert,
	FileText,
	FolderTree,
	Globe,
	HardDrive,
	type LucideIcon,
	Sparkles,
	Wrench,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '../ui/accordion';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Separator } from '../ui/separator';
import { Skeleton } from '../ui/skeleton';
import { cn } from '@/lib/utils';
import { useUserContext } from '@/provider/user-provider';
import { getMineFileSystems } from '@/service/file-system';
import { searchAiModel } from '@/service/ai';
import { searchUableEngines } from '@/service/engine';
import { EngineCategory } from '@/enums/engine';
import {
	getRequiredUserSettings,
	hasPendingRequiredUserSettings,
	type RequiredUserSettingField,
} from '@/lib/required-user-settings';
import InitMineModel from './init-mine-model';
import InitMineEngine from './init-mine-engine';
import DefaultFileSystemChange from './default-file-system-change';
import RevornixAIModel from './revornix-ai-model';
import DocumentSummaryModel from './document-summary-model';
import DefaultWebsiteDocumentParseEngineChange from './default-website-document-parse-engine-change';
import DefaultFileDocumentParseEngineChange from './default-file-document-parse-engine-change';
import DefaultPodcastEngineChange from './default-podcast-engine-change';
import DocumentImageGenerateEngineChange from './document-image-generate-engine-change';

type InitSettingDialogProps = {
	showAlert?: boolean;
};

type SetupCardProps = {
	title: string;
	description: string;
	icon: LucideIcon;
	completed: boolean;
	completedLabel: string;
	pendingLabel: string;
	loading?: boolean;
	blockedHint?: string;
	children?: ReactNode;
};

const SetupSettingCard = ({
	title,
	description,
	icon: Icon,
	completed,
	completedLabel,
	pendingLabel,
	loading = false,
	blockedHint,
	children,
}: SetupCardProps) => {
	return (
		<Card className='gap-0 rounded-[26px] border-border/60 bg-card/85 py-0 shadow-[0_24px_60px_-46px_rgba(15,23,42,0.5)] backdrop-blur'>
			<CardHeader className='gap-3 px-5 pt-5 pb-0 sm:px-6 sm:pt-6'>
				<div className='flex items-start justify-between gap-3'>
					<div className='flex items-start gap-3'>
						<div className='flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/15 via-sky-500/12 to-transparent text-foreground'>
							<Icon className='size-5' />
						</div>
						<div className='space-y-1'>
							<CardTitle className='text-base'>{title}</CardTitle>
							<p className='text-sm leading-6 text-muted-foreground'>
								{description}
							</p>
						</div>
					</div>
					<Badge
						variant='outline'
						className={cn(
							'shrink-0 rounded-full px-2.5 py-1 text-[11px]',
							completed
								? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200'
								: 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-200',
						)}>
						{completed ? <CheckCircle2 className='size-3.5' /> : null}
						{completed ? completedLabel : pendingLabel}
					</Badge>
				</div>
			</CardHeader>
			<CardContent className='px-5 pt-4 pb-5 sm:px-6 sm:pt-4 sm:pb-5 mt-auto'>
				{loading ? (
					<div className='space-y-2'>
						<Skeleton className='h-10 w-full rounded-2xl' />
						<Skeleton className='h-4 w-2/3 rounded-full' />
					</div>
				) : blockedHint ? (
					<div className='rounded-2xl border border-dashed border-amber-500/30 bg-amber-500/8 px-4 py-3 text-sm leading-6 text-amber-800 dark:text-amber-200'>
						{blockedHint}
					</div>
				) : (
					children
				)}
			</CardContent>
		</Card>
	);
};

type SetupSupportCardProps = {
	value: string;
	title: string;
	description: string;
	icon: LucideIcon;
	expandLabel: string;
	children: ReactNode;
};

const SetupSupportCard = ({
	value,
	title,
	description,
	icon: Icon,
	expandLabel,
	children,
}: SetupSupportCardProps) => {
	return (
		<Card className='gap-0 overflow-hidden rounded-[26px] border-border/60 bg-card/80 py-0 shadow-[0_24px_60px_-46px_rgba(15,23,42,0.5)] backdrop-blur'>
			<AccordionItem value={value} className='border-b-0'>
				<AccordionTrigger className='px-5 py-5 hover:no-underline sm:px-6 sm:py-6'>
					<div className='flex flex-1 items-start gap-3 pr-2'>
						<div className='flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/15 via-sky-500/12 to-transparent'>
							<Icon className='size-5' />
						</div>
						<div className='space-y-1 text-left'>
							<CardTitle className='text-base'>{title}</CardTitle>
							<p className='text-sm leading-6 text-muted-foreground'>
								{description}
							</p>
							<p className='text-xs leading-5 text-muted-foreground'>
								{expandLabel}
							</p>
						</div>
					</div>
				</AccordionTrigger>
				<AccordionContent className='px-5 pb-5 sm:px-6 sm:pb-6'>
					<div className='border-t border-border/60 pt-4'>{children}</div>
				</AccordionContent>
			</AccordionItem>
		</Card>
	);
};

const InitSettingDialog = ({
	showAlert = false,
}: InitSettingDialogProps) => {
	const t = useTranslations();
	const { mainUserInfo } = useUserContext();
	const [showDialog, setShowDialog] = useState(false);
	const [expandedSupportCard, setExpandedSupportCard] = useState('');
	const hasLoadedUserInfo = mainUserInfo !== undefined;
	const requiredSettings = useMemo(
		() => getRequiredUserSettings(mainUserInfo),
		[mainUserInfo],
	);
	const requiredSettingMap = useMemo(
		() => new Map(requiredSettings.map((setting) => [setting.field, setting])),
		[requiredSettings],
	);
	const needInitial =
		hasLoadedUserInfo && hasPendingRequiredUserSettings(mainUserInfo);
	const completedCount = requiredSettings.filter((setting) => setting.completed)
		.length;
	const totalCount = requiredSettings.length;
	const missingSettings = requiredSettings.filter((setting) => !setting.completed);
	const progress = totalCount === 0 ? 0 : (completedCount / totalCount) * 100;

	const modelQuery = useQuery({
		enabled: hasLoadedUserInfo,
		queryKey: ['getModels'],
		queryFn: async () => {
			return await searchAiModel({
				keyword: '',
			});
		},
	});
	const engineQuery = useQuery({
		enabled: hasLoadedUserInfo,
		queryKey: ['searchMyEngine', EngineCategory.Markdown],
		queryFn: async () => {
			return await searchUableEngines({
				keyword: '',
				filter_category: EngineCategory.Markdown,
			});
		},
	});
	const podcastEngineQuery = useQuery({
		enabled: hasLoadedUserInfo,
		queryKey: ['searchMyEngine', EngineCategory.TTS],
		queryFn: async () => {
			return await searchUableEngines({
				keyword: '',
				filter_category: EngineCategory.TTS,
			});
		},
	});
	const imageGenerateEngineQuery = useQuery({
		enabled: hasLoadedUserInfo,
		queryKey: ['searchMyEngine', EngineCategory.IMAGE_GENERATE],
		queryFn: async () => {
			return await searchUableEngines({
				keyword: '',
				filter_category: EngineCategory.IMAGE_GENERATE,
			});
		},
	});
	const fileSystemQuery = useQuery({
		enabled: hasLoadedUserInfo,
		queryKey: ['mine-file-system'],
		queryFn: async () => {
			return await getMineFileSystems({ keyword: '' });
		},
	});

	const modelCount = modelQuery.data?.data?.length ?? 0;
	const engineCount = engineQuery.data?.data?.length ?? 0;
	const podcastEngineCount = podcastEngineQuery.data?.data?.length ?? 0;
	const imageGenerateEngineCount =
		imageGenerateEngineQuery.data?.data?.length ?? 0;
	const fileSystemCount = fileSystemQuery.data?.data?.length ?? 0;

	const needsModelSetup = !modelQuery.isLoading && modelCount === 0;
	const needsEngineSetup = !engineQuery.isLoading && engineCount === 0;
	const hasPodcastEngineConfigured = Boolean(
		mainUserInfo?.default_podcast_user_engine_id,
	);
	const hasImageGenerateEngineConfigured = Boolean(
		mainUserInfo?.default_image_generate_engine_id,
	);

	const settingCards = [
		{
			field: 'default_user_file_system' as const,
			icon: HardDrive,
			description: t('init_setting_default_file_system_description'),
			loading: fileSystemQuery.isLoading,
			blockedHint:
				!fileSystemQuery.isLoading && fileSystemCount === 0
					? t('init_setting_file_system_missing_hint')
					: undefined,
			control: <DefaultFileSystemChange />,
		},
		{
			field: 'default_revornix_model_id' as const,
			icon: Bot,
			description: t('init_setting_revornix_ai_model_description'),
			loading: modelQuery.isLoading,
			blockedHint:
				!modelQuery.isLoading && modelCount === 0
					? t('init_setting_model_missing_hint')
					: undefined,
			control: <RevornixAIModel />,
		},
		{
			field: 'default_document_reader_model_id' as const,
			icon: BookOpenText,
			description: t('init_setting_document_summary_model_description'),
			loading: modelQuery.isLoading,
			blockedHint:
				!modelQuery.isLoading && modelCount === 0
					? t('init_setting_model_missing_hint')
					: undefined,
			control: <DocumentSummaryModel />,
		},
		{
			field: 'default_website_document_parse_user_engine_id' as const,
			icon: Globe,
			description: t('init_setting_website_convert_engine_description'),
			loading: engineQuery.isLoading,
			blockedHint:
				!engineQuery.isLoading && engineCount === 0
					? t('init_setting_engine_missing_hint')
					: undefined,
			control: <DefaultWebsiteDocumentParseEngineChange />,
		},
		{
			field: 'default_file_document_parse_user_engine_id' as const,
			icon: FileText,
			description: t('init_setting_file_convert_engine_description'),
			loading: engineQuery.isLoading,
			blockedHint:
				!engineQuery.isLoading && engineCount === 0
					? t('init_setting_engine_missing_hint')
					: undefined,
			control: <DefaultFileDocumentParseEngineChange />,
		},
	] satisfies Array<{
		field: RequiredUserSettingField;
		icon: LucideIcon;
		description: string;
		loading: boolean;
		blockedHint?: string;
		control: ReactNode;
	}>;

	const handleOpenChange = (open: boolean) => {
		if (!open) {
			setExpandedSupportCard('');
		}
		setShowDialog(open);
	};

	return (
		<>
			{showAlert && needInitial && (
				<Alert className='rounded-[24px] border-border/60 bg-card/75 px-4 py-4 shadow-[0_18px_45px_-34px_rgba(15,23,42,0.45)] backdrop-blur-xl'>
					<CircleAlert className='size-4 text-amber-600 dark:text-amber-300' />
					<div className='flex flex-1 flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
						<div className='space-y-1'>
							<AlertTitle className='line-clamp-none'>
								{t('init_setting_alert_title')}
							</AlertTitle>
							<AlertDescription className='gap-2'>
								<p>{t('init_setting_alert')}</p>
								<Badge
									variant='outline'
									className='rounded-full border-border/60 bg-background/70 px-3 py-1'>
									{t('init_setting_alert_progress', {
										completed: completedCount,
										total: totalCount,
									})}
								</Badge>
							</AlertDescription>
						</div>
						<Button
							onClick={() => setShowDialog(true)}
							className='rounded-full px-5'>
							{t('init_setting_quick_set')}
						</Button>
					</div>
				</Alert>
			)}
			<Dialog open={showDialog} onOpenChange={handleOpenChange}>
				<DialogContent
					className='left-0 top-0 h-[100dvh] max-h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 border-0 bg-transparent p-0 shadow-none sm:left-1/2 sm:top-1/2 sm:h-[min(92vh,920px)] sm:max-h-[calc(100vh-1rem)] sm:w-[calc(100vw-1rem)] sm:max-w-[min(1360px,calc(100vw-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2'>
					<div className='flex h-full min-h-0 overflow-hidden rounded-none border border-border/70 bg-background/95 text-foreground shadow-[0_40px_120px_-60px_rgba(15,23,42,0.7)] backdrop-blur-2xl sm:rounded-[32px]'>
						<div className='grid h-full min-h-0 w-full grid-cols-1 lg:grid-cols-[380px_minmax(0,1fr)] xl:grid-cols-[420px_minmax(0,1fr)]'>
							<aside className='relative hidden min-h-0 overflow-hidden border-b border-border/60 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.14),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.14),transparent_38%)] p-6 sm:p-8 xl:p-9 lg:block lg:border-b-0 lg:border-r'>
								<div className='pointer-events-none absolute inset-0'>
									<div className='absolute inset-0 bg-background/78 backdrop-blur-xl' />
									<div className='absolute left-[-3rem] top-[-4rem] size-40 rounded-full bg-emerald-500/10 blur-3xl' />
									<div className='absolute right-[-3rem] bottom-[-5rem] size-48 rounded-full bg-sky-500/10 blur-3xl' />
								</div>
								<div className='relative flex h-full min-h-0 flex-col'>
									<Badge className='mb-4 rounded-full bg-foreground text-background shadow-sm'>
										<Sparkles className='size-3.5' />
										{t('init_setting_panel_badge')}
									</Badge>
									<div className='space-y-3'>
										<h2 className='text-2xl font-semibold tracking-tight text-balance'>
											{t('init_setting_panel_title', {
												name: mainUserInfo?.nickname ?? 'Revornix',
											})}
										</h2>
										<p className='text-sm leading-7 text-muted-foreground'>
											{t('init_setting_panel_description')}
										</p>
									</div>
									<div className='mt-8 rounded-[26px] border border-border/60 bg-card/80 p-5 shadow-[0_24px_50px_-45px_rgba(15,23,42,0.55)] backdrop-blur'>
										<div className='flex items-end justify-between gap-3'>
											<div>
												<p className='text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground'>
													{t('init_setting_progress_label')}
												</p>
												<p className='mt-2 text-3xl font-semibold tracking-tight'>
													{completedCount}
													<span className='text-lg text-muted-foreground'>
														/{totalCount}
													</span>
												</p>
											</div>
											<Badge
												variant='outline'
												className='rounded-full border-sky-500/20 bg-sky-500/10 px-3 py-1 text-sky-700 dark:text-sky-200'>
												{Math.round(progress)}%
											</Badge>
										</div>
										<div className='mt-4 h-2 overflow-hidden rounded-full bg-foreground/8'>
											<div
												className='h-full rounded-full bg-[linear-gradient(90deg,#10b981_0%,#38bdf8_65%,#0ea5e9_100%)] transition-all duration-500'
												style={{ width: `${progress}%` }}
											/>
										</div>
										<p className='mt-3 text-sm text-muted-foreground'>
											{needInitial
												? t('init_setting_remaining_summary', {
														count: missingSettings.length,
													})
												: t('init_setting_complete_summary')}
										</p>
									</div>
									<div className='mt-6 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1'>
										<div>
											<p className='text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground'>
												{t('init_setting_checklist_title')}
											</p>
										</div>
										<div className='space-y-3'>
											{requiredSettings.map((setting) => (
												<div
													key={setting.field}
													className={cn(
														'flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition-colors',
														setting.completed
															? 'border-emerald-500/20 bg-emerald-500/10'
															: 'border-border/60 bg-card/70',
													)}>
													<div className='min-w-0'>
														<p className='truncate text-sm font-medium'>
															{t(setting.labelKey)}
														</p>
													</div>
													<Badge
														variant='outline'
														className={cn(
															'rounded-full px-2.5 py-1 text-[11px]',
															setting.completed
																? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200'
																: 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-200',
														)}>
														{setting.completed
															? t('init_setting_done_label')
															: t('init_setting_pending_label')}
													</Badge>
												</div>
											))}
										</div>
									</div>
									<div className='mt-6 space-y-3 rounded-[28px] border border-border/60 bg-background/80 p-5 backdrop-blur'>
										<div className='flex items-start gap-3'>
											<div className='flex size-10 shrink-0 items-center justify-center rounded-2xl bg-foreground/5'>
												<FolderTree className='size-5 text-muted-foreground' />
											</div>
											<div className='space-y-1'>
												<p className='text-sm font-medium'>
													{t('init_setting_sidebar_tip_title')}
												</p>
												<p className='text-sm leading-6 text-muted-foreground'>
													{t('init_setting_sidebar_tip_description')}
												</p>
											</div>
										</div>
										<Button
											asChild
											variant='outline'
											className='w-full justify-between rounded-2xl bg-background/60'>
											<Link href='/setting'>
												{t('init_setting_open_settings')}
												<ArrowRight className='size-4' />
											</Link>
										</Button>
									</div>
								</div>
							</aside>

							<section className='flex min-h-0 flex-col overflow-hidden bg-[linear-gradient(180deg,transparent_0%,rgba(15,23,42,0.03)_100%)] dark:bg-[linear-gradient(180deg,transparent_0%,rgba(255,255,255,0.03)_100%)]'>
								<div className='border-b border-border/60 px-4 py-4 sm:px-8 sm:py-6 xl:px-10 xl:py-7'>
									<div className='flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between'>
										<div className='space-y-2'>
											<p className='text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground'>
												{t('init_setting_workspace_badge')}
											</p>
											<div>
												<h3 className='text-xl font-semibold tracking-tight'>
													{needInitial
														? t('init_setting_workspace_title')
														: t('init_setting_complete_title')}
												</h3>
												<p className='mt-1 text-sm leading-6 text-muted-foreground'>
													{needInitial
														? t('init_setting_workspace_description')
														: t('init_setting_complete_description')}
												</p>
											</div>
										</div>
										<div className='flex flex-wrap gap-2'>
											<Badge
												variant='outline'
												className='rounded-full border-border/70 bg-background/80 px-3 py-1'>
												{t('init_setting_can_change_later')}
											</Badge>
										</div>
									</div>
								</div>

								<div className='min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-8 sm:py-8 sm:pb-10 xl:px-10'>
									{!needInitial ? (
										<div className='flex min-h-full items-center justify-center'>
											<div className='w-full max-w-xl rounded-[32px] border border-emerald-500/20 bg-card/88 p-8 text-center shadow-[0_32px_80px_-55px_rgba(16,185,129,0.38)] backdrop-blur'>
												<div className='mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-500/12'>
													<CheckCircle2 className='size-8 text-emerald-600' />
												</div>
												<h4 className='mt-6 text-2xl font-semibold tracking-tight'>
													{t('init_setting_complete_title')}
												</h4>
												<p className='mt-3 text-sm leading-7 text-muted-foreground'>
													{t('init_setting_complete_description')}
												</p>
												<div className='mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center'>
													<Button
														onClick={() => setShowDialog(false)}
														className='rounded-full px-6'>
														{t('init_setting_start_button')}
													</Button>
													<Button
														asChild
														variant='outline'
														className='rounded-full px-6'>
														<Link href='/setting'>
															{t('init_setting_open_settings')}
														</Link>
													</Button>
												</div>
											</div>
										</div>
									) : (
										<div className='space-y-6'>
											<div className='lg:hidden'>
												<Card className='gap-0 rounded-[24px] border-border/60 bg-card/85 py-0 shadow-[0_20px_50px_-40px_rgba(15,23,42,0.5)] backdrop-blur'>
													<CardHeader className='gap-3 px-4 pt-4 pb-0'>
														<Badge className='rounded-full bg-foreground text-background shadow-sm'>
															<Sparkles className='size-3.5' />
															{t('init_setting_panel_badge')}
														</Badge>
														<div className='space-y-2'>
															<CardTitle className='text-xl leading-tight'>
																{t('init_setting_panel_title', {
																	name: mainUserInfo?.nickname ?? 'Revornix',
																})}
															</CardTitle>
															<p className='text-sm leading-6 text-muted-foreground'>
																{t('init_setting_panel_description')}
															</p>
														</div>
													</CardHeader>
													<CardContent className='px-4 pt-4 pb-4'>
														<div className='rounded-[20px] border border-border/60 bg-background/70 p-4'>
															<div className='flex items-end justify-between gap-3'>
																<div>
																	<p className='text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground'>
																		{t('init_setting_progress_label')}
																	</p>
																	<p className='mt-2 text-2xl font-semibold tracking-tight'>
																		{completedCount}
																		<span className='text-base text-muted-foreground'>
																			/{totalCount}
																		</span>
																	</p>
																</div>
																<Badge
																	variant='outline'
																	className='rounded-full border-sky-500/20 bg-sky-500/10 px-3 py-1 text-sky-700 dark:text-sky-200'>
																	{Math.round(progress)}%
																</Badge>
															</div>
															<div className='mt-3 h-2 overflow-hidden rounded-full bg-foreground/8'>
																<div
																	className='h-full rounded-full bg-[linear-gradient(90deg,#10b981_0%,#38bdf8_65%,#0ea5e9_100%)] transition-all duration-500'
																	style={{ width: `${progress}%` }}
																/>
															</div>
															<div className='mt-4 flex flex-wrap gap-2'>
																{requiredSettings.map((setting) => (
																	<Badge
																		key={setting.field}
																		variant='outline'
																		className={cn(
																			'max-w-full rounded-full px-2.5 py-1 text-[11px]',
																			setting.completed
																				? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200'
																				: 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-200',
																		)}>
																		<span className='truncate'>
																			{t(setting.labelKey)}
																		</span>
																	</Badge>
																))}
															</div>
														</div>
														<Button
															asChild
															variant='outline'
															className='mt-4 w-full justify-between rounded-2xl bg-background/60'>
															<Link href='/setting'>
																{t('init_setting_open_settings')}
																<ArrowRight className='size-4' />
															</Link>
														</Button>
													</CardContent>
												</Card>
											</div>
											{(needsModelSetup || needsEngineSetup) && (
												<section className='space-y-3'>
													<div className='space-y-1'>
														<h4 className='text-lg font-semibold tracking-tight'>
															{t('init_setting_support_section_title')}
														</h4>
														<p className='text-sm leading-6 text-muted-foreground'>
															{t('init_setting_support_section_description')}
														</p>
													</div>
													<Accordion
														type='single'
														collapsible
														value={expandedSupportCard}
														onValueChange={setExpandedSupportCard}
														className='space-y-3'>
														{needsModelSetup && (
															<SetupSupportCard
																value='model'
																title={t('init_setting_model_support_title')}
																description={t(
																	'init_setting_model_support_description',
																)}
																icon={Bot}
																expandLabel={t(
																	'init_setting_support_expand_hint',
																)}>
																<InitMineModel />
															</SetupSupportCard>
														)}
														{needsEngineSetup && (
															<SetupSupportCard
																value='engine'
																title={t('init_setting_engine_support_title')}
																description={t(
																	'init_setting_engine_support_description',
																)}
																icon={Wrench}
																expandLabel={t(
																	'init_setting_support_expand_hint',
																)}>
																<InitMineEngine />
															</SetupSupportCard>
														)}
													</Accordion>
												</section>
											)}

											<section className='space-y-3'>
												<div className='space-y-1'>
													<h4 className='text-lg font-semibold tracking-tight'>
														{t('init_setting_required_section_title')}
													</h4>
													<p className='text-sm leading-6 text-muted-foreground'>
														{t('init_setting_required_section_description')}
													</p>
												</div>
												<div className='grid gap-3 xl:grid-cols-2'>
													{settingCards.map((card) => {
														const setting = requiredSettingMap.get(card.field);
														if (!setting) {
															return null;
														}
														return (
															<SetupSettingCard
																key={card.field}
																title={t(setting.labelKey)}
																description={card.description}
																icon={card.icon}
																completed={setting.completed}
																completedLabel={t('init_setting_done_label')}
																pendingLabel={t('init_setting_pending_label')}
																loading={card.loading}
																blockedHint={card.blockedHint}>
																<div className='space-y-2'>
																	<div className='w-full [&_[data-slot=select-trigger]]:h-11 [&_[data-slot=select-trigger]]:w-full [&_[data-slot=select-trigger]]:rounded-2xl [&_[data-slot=select-trigger]]:border-border/70 [&_[data-slot=select-trigger]]:bg-background'>
																		{card.control}
																	</div>
																	<p className='text-xs leading-5 text-muted-foreground pl-2'>
																		{t('init_setting_card_helper')}
																	</p>
																</div>
															</SetupSettingCard>
														);
													})}
												</div>
											</section>

											<section className='space-y-3'>
												<div className='space-y-1'>
													<h4 className='text-lg font-semibold tracking-tight'>
														{t('init_setting_optional_section_title')}
													</h4>
													<p className='text-sm leading-6 text-muted-foreground'>
														{t('init_setting_optional_section_description')}
													</p>
												</div>
												<div className='grid gap-3 xl:grid-cols-2'>
													<SetupSettingCard
														title={t('init_setting_podcast_engine')}
														description={t(
															'init_setting_podcast_engine_description',
														)}
														icon={Wrench}
														completed={hasPodcastEngineConfigured}
														completedLabel={t(
															'init_setting_optional_configured_label',
														)}
														pendingLabel={t(
															'init_setting_optional_label',
														)}
														loading={podcastEngineQuery.isLoading}
														blockedHint={
															!podcastEngineQuery.isLoading &&
															podcastEngineCount === 0
																? t(
																		'init_setting_podcast_engine_missing_hint',
																	)
																: undefined
														}>
														<div className='space-y-2'>
															<div className='w-full [&_[data-slot=select-trigger]]:h-11 [&_[data-slot=select-trigger]]:w-full [&_[data-slot=select-trigger]]:rounded-2xl [&_[data-slot=select-trigger]]:border-border/70 [&_[data-slot=select-trigger]]:bg-background'>
																<DefaultPodcastEngineChange />
															</div>
															<p className='text-xs leading-5 text-muted-foreground'>
																{t('init_setting_optional_helper')}
															</p>
														</div>
													</SetupSettingCard>
													<SetupSettingCard
														title={t('init_setting_image_generate_engine')}
														description={t(
															'init_setting_image_generate_engine_description',
														)}
														icon={Sparkles}
														completed={hasImageGenerateEngineConfigured}
														completedLabel={t(
															'init_setting_optional_configured_label',
														)}
														pendingLabel={t(
															'init_setting_optional_label',
														)}
														loading={imageGenerateEngineQuery.isLoading}
														blockedHint={
															!imageGenerateEngineQuery.isLoading &&
															imageGenerateEngineCount === 0
																? t(
																		'init_setting_image_generate_engine_missing_hint',
																	)
																: undefined
														}>
														<div className='space-y-2'>
															<div className='w-full [&_[data-slot=select-trigger]]:h-11 [&_[data-slot=select-trigger]]:w-full [&_[data-slot=select-trigger]]:rounded-2xl [&_[data-slot=select-trigger]]:border-border/70 [&_[data-slot=select-trigger]]:bg-background'>
																<DocumentImageGenerateEngineChange />
															</div>
															<p className='text-xs leading-5 text-muted-foreground'>
																{t('init_setting_optional_helper')}
															</p>
														</div>
													</SetupSettingCard>
												</div>
											</section>
										</div>
									)}
								</div>

								<Separator />
								<div className='flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-5 xl:px-10'>
									<p className='text-sm text-muted-foreground'>
										{needInitial
											? t('init_setting_footer_pending', {
													count: missingSettings.length,
												})
											: t('init_setting_footer_done')}
									</p>
									<div className='flex flex-col gap-2 sm:flex-row'>
										<Button
											asChild
											variant='outline'
											className='rounded-full px-5'>
											<Link href='/setting'>
												{t('init_setting_open_settings')}
											</Link>
										</Button>
										<Button
											onClick={() => setShowDialog(false)}
											className='rounded-full px-5'>
											{needInitial
												? t('init_setting_continue_later')
												: t('init_setting_start_button')}
										</Button>
									</div>
								</div>
							</section>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
};

export default InitSettingDialog;
