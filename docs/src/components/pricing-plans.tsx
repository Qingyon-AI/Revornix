'use client';

import Link from 'next/link';
import { CircleCheckBig, Info, Star } from 'lucide-react';
import { useState } from 'react';

import { Button } from './ui/button';
import { Badge } from './ui/badge';

type Lang = 'zh' | 'en';
type Currency = 'CNY' | 'USD';

type Feature = {
	text: string;
	badge?: string;
};

type Plan = {
	name: string;
	prices?: Record<Currency, string>;
	price?: string;
	unit: string;
	currencyLabel?: string;
	recommended?: boolean;
	custom?: boolean;
	description?: string;
	features?: Feature[];
	buttonText: string;
	buttonHref: string;
};

type ComputePackPlan = {
	name: string;
	prices: Record<Currency, string>;
	unit: string;
	description: string;
	features: Feature[];
	buttonText: string;
	buttonHref: string;
};

const contentMap: Record<
	Lang,
		{
			warningTitle: string;
			warningText: string;
			computePackTitle: string;
			computePackDescription: string;
			recommendedText: string;
			cnyText: string;
			usdText: string;
			plans: Plan[];
			computePacks: ComputePackPlan[];
		}
	> = {
	zh: {
		warningTitle: '警告',
		warningText:
			'本页展示的 Free / Pro / Max 月费、赠送积分额度与算力包价格，对应支付系统中的默认产品配置。',
		computePackTitle: '算力包',
		computePackDescription:
			'算力包为一次性购买，用于补充官方托管 AI 的积分额度，适合超出会员月赠送额度后的继续使用。',
		recommendedText: '用户偏爱',
		cnyText: '人民币',
		usdText: '美元',
		plans: [
			{
				name: '免费计划',
				prices: {
					CNY: 'CNY 0',
					USD: 'USD 0',
				},
				unit: '/月',
				currencyLabel: '货币类型',
				buttonText: '订阅',
				buttonHref: 'https://app.revornix.com/account/plan',
				features: [
					{ text: '收录链接、文件', badge: '20 each' },
					{ text: '收录速记' },
					{ text: '文档待读记录' },
					{ text: '多端同步' },
					{ text: 'AI智能总结（需要自行配置模型）' },
					{ text: '专栏插图生成（需要自行配置模型）' },
					{ text: 'Revornix AI（需要自行配置模型）' },
					{ text: '各大平台热搜一览' },
					{ text: '自动推送当天热搜以及知识库总结（需要自行配置模型）' },
					{ text: 'API接口收录', badge: '10 times / day' },
					{ text: 'MCP 客户端' },
					{ text: '自动生成专栏/文档的播客（需要自行配置模型）' },
				],
			},
			{
				name: 'Pro 计划',
				prices: {
					CNY: 'CNY 39',
					USD: 'USD 10.90',
				},
				unit: '/月',
				currencyLabel: '货币类型',
				recommended: true,
				buttonText: '订阅',
				buttonHref: 'https://app.revornix.com/account/plan',
				features: [
					{ text: '包含 Free 全部能力，并可使用官方托管 AI' },
					{ text: '文档与专栏知识图谱' },
					{ text: '每月包含可共享使用的官方总积分额度', badge: '4.3M pts' },
					{ text: '按当前默认官方组合计费，约等于 1 份标准月组合额度，可覆盖 Revornix AI、Banana Image 与豆包播客引擎的常见使用' },
					{ text: 'Revornix AI、插图生成、播客生成等官方能力按统一积分池消耗' },
					{ text: '各大平台热搜一览' },
					{ text: 'API接口收录', badge: '25 / day' },
					{ text: 'MCP 客户端和服务端' },
					{ text: '专栏多人协作' },
				],
			},
			{
				name: 'Max 计划',
				prices: {
					CNY: 'CNY 149',
					USD: 'USD 39.90',
				},
				unit: '/月',
				currencyLabel: '货币类型',
				buttonText: '订阅',
				buttonHref: 'https://app.revornix.com/account/plan',
				features: [
					{ text: '包含 Pro 全部能力，面向创作者与重度用户' },
					{ text: '更多的每月官方总积分额度', badge: '17.2M pts' },
					{ text: '按当前默认官方组合计费，约等于 4 份标准月组合额度，可覆盖更高频的 Revornix AI、Banana Image 与豆包播客引擎使用' },
					{ text: '更适合高频使用 Revornix AI、插图生成与播客生成' },
					{ text: '各大平台热搜一览' },
					{ text: 'API接口收录', badge: '50 / day' },
					{ text: 'MCP 客户端和服务端' },
					{ text: '专栏多人协作' },
				],
			},
			{
				name: '定制计划',
				price: '定制',
				unit: '/月',
				custom: true,
				description:
					'该计划属于定制计划，请联系客服进行询问，暂不支持定制低于max配额的计划。',
				buttonText: '联系客服',
				buttonHref: '/docs/contact',
				},
			],
			computePacks: [
				{
					name: '算力包 入门版',
					prices: {
						CNY: 'CNY 12',
						USD: 'USD 3.90',
					},
					unit: '/次',
					description: '适合小规模尝试和轻量补充的低门槛算力包。',
					features: [
						{ text: '通用于官方 LLM、插图、播客等场景', badge: '500k pts' },
						{ text: '用于补充官方托管 AI 的超额消耗' },
						{ text: '一次性购买，适合短时补量' },
					],
					buttonText: '购买',
					buttonHref: 'https://app.revornix.com/account/plan#compute-pack',
				},
				{
					name: '算力包 进阶版',
					prices: {
						CNY: 'CNY 39',
						USD: 'USD 11.90',
					},
					unit: '/次',
					description: '适合经常超出 Pro 月额度的主力补充包。',
					features: [
						{ text: '通用于官方 LLM、插图、播客等场景', badge: '2M pts' },
						{ text: '更适合活跃用户的均衡型补充' },
						{ text: '一次性购买，适合搭配 Pro 使用' },
					],
					buttonText: '购买',
					buttonHref: 'https://app.revornix.com/account/plan#compute-pack',
				},
				{
					name: '算力包 重度版',
					prices: {
						CNY: 'CNY 129',
						USD: 'USD 39.90',
					},
					unit: '/次',
					description: '适合创作者与高频自动化场景的大容量补充包。',
					features: [
						{ text: '通用于官方 LLM、插图、播客等场景', badge: '8M pts' },
						{ text: '适合创作者与生产流的高容量补充' },
						{ text: '一次性购买，适合高频官方能力消耗' },
					],
					buttonText: '购买',
					buttonHref: 'https://app.revornix.com/account/plan#compute-pack',
				},
			],
		},
	en: {
		warningTitle: 'Warning',
		warningText:
			'This page is synced to the current product initializer: Free / Pro / Max monthly pricing, gifted point allowances, and compute-pack pricing all match the default product data in the payment system.',
		computePackTitle: 'Compute Packs',
		computePackDescription:
			'Compute packs are one-time purchases for topping up official hosted AI points after you exceed the monthly allowance included in your plan.',
		recommendedText: 'Recommended',
		cnyText: 'CNY',
		usdText: 'USD',
		plans: [
			{
				name: 'Free Plan',
				prices: {
					CNY: 'CNY 0',
					USD: 'USD 0',
				},
				unit: '/Month',
				currencyLabel: 'Currency',
				buttonText: 'Subscribe',
				buttonHref: 'https://app.revornix.com/account/plan',
				features: [
					{ text: 'Capture links, files.', badge: '20 each' },
					{ text: 'Capture quick notes.' },
					{ text: 'Document reading queue.' },
					{ text: 'Multi-device sync.' },
					{ text: 'AI-powered summarization (requires self-configured model).' },
					{ text: 'Section illustration generation (requires self-configured model).' },
					{ text: 'Revornix AI (requires self-configured model).' },
					{ text: 'Overview of trending topics across major platforms.' },
					{ text: "Automatically push the day's trending topics and knowledge base summary (requires self-configured model)." },
					{ text: 'API endpoint ingestion.', badge: '10 times / day' },
					{ text: 'MCP Client' },
					{ text: 'Automatically generate podcasts for sections/documents (requires self-configured model).' },
				],
			},
			{
				name: 'Pro Plan',
				prices: {
					CNY: 'CNY 39',
					USD: 'USD 10.90',
				},
				unit: '/Month',
				currencyLabel: 'Currency',
				recommended: true,
				buttonText: 'Subscribe',
				buttonHref: 'https://app.revornix.com/account/plan',
				features: [
					{ text: 'Everything in Free, with access to official hosted capabilities.' },
					{ text: 'Document and section knowledge graph.' },
					{ text: 'Monthly hosted point allowance shared across official AI features.', badge: '4.3M pts' },
					{ text: 'Based on the current default hosted stack, roughly equal to one standard monthly mix across Revornix AI, Banana Image, and Volc Podcast Engine.' },
					{ text: 'Revornix AI, illustration generation, and podcast generation draw from the same hosted point pool.' },
					{ text: 'Overview of trending topics across major platforms.' },
					{ text: 'API endpoint ingestion.', badge: '25 / day' },
					{ text: 'MCP Client and MCP Server.' },
					{ text: 'Section collaboration by multiple users.' },
				],
			},
			{
				name: 'Max Plan',
				prices: {
					CNY: 'CNY 149',
					USD: 'USD 39.90',
				},
				unit: '/Month',
				currencyLabel: 'Currency',
				buttonText: 'Subscribe',
				buttonHref: 'https://app.revornix.com/account/plan',
				features: [
					{ text: 'Everything in Pro, tuned for creators and heavy users.' },
					{ text: 'Larger monthly hosted point allowance shared across official AI features.', badge: '17.2M pts' },
					{ text: 'Based on the current default hosted stack, roughly equal to four standard monthly mixes across Revornix AI, Banana Image, and Volc Podcast Engine.' },
					{ text: 'Better suited for heavier use of Revornix AI, illustration generation, and podcast generation.' },
					{ text: 'Overview of trending topics across major platforms.' },
					{ text: 'API endpoint ingestion.', badge: '50 / day' },
					{ text: 'MCP Client and MCP Server.' },
					{ text: 'Section collaboration by multiple users.' },
				],
			},
			{
				name: 'Custom Plan',
				price: 'Custom',
				unit: '/Month',
				custom: true,
				description:
					'This plan is a custom plan. Please contact customer service for inquiries. Custom plans with a quota lower than the maximum are currently not supported.',
				buttonText: 'Contact Support',
				buttonHref: '/docs/contact',
				},
			],
			computePacks: [
				{
					name: 'Starter Compute Pack',
					prices: {
						CNY: 'CNY 12',
						USD: 'USD 3.90',
					},
					unit: '/Pack',
					description: 'A low-risk top-up for small bursts of official AI usage.',
					features: [
						{ text: 'General-purpose points for official LLM, image, and podcast usage.', badge: '500k pts' },
						{ text: 'Top up official hosted AI overage.' },
						{ text: 'One-time purchase for light extension needs.' },
					],
					buttonText: 'Buy',
					buttonHref: 'https://app.revornix.com/account/plan#compute-pack',
				},
				{
					name: 'Growth Compute Pack',
					prices: {
						CNY: 'CNY 39',
						USD: 'USD 11.90',
					},
					unit: '/Pack',
					description: 'The main top-up pack for users who regularly exceed Pro monthly allowance.',
					features: [
						{ text: 'General-purpose points for official LLM, image, and podcast usage.', badge: '2M pts' },
						{ text: 'Balanced top-up for active users.' },
						{ text: 'One-time purchase that pairs well with Pro.' },
					],
					buttonText: 'Buy',
					buttonHref: 'https://app.revornix.com/account/plan#compute-pack',
				},
				{
					name: 'Scale Compute Pack',
					prices: {
						CNY: 'CNY 129',
						USD: 'USD 39.90',
					},
					unit: '/Pack',
					description: 'The heavy-duty top-up for creators, production workflows, and large official AI demand.',
					features: [
						{ text: 'General-purpose points for official LLM, image, and podcast usage.', badge: '8M pts' },
						{ text: 'High-capacity top-up for creator and automation-heavy workflows.' },
						{ text: 'One-time purchase for sustained high usage.' },
					],
					buttonText: 'Buy',
					buttonHref: 'https://app.revornix.com/account/plan#compute-pack',
				},
			],
		},
	};

const PricingPlans = ({ lang }: { lang: Lang }) => {
	const content = contentMap[lang];
	const [currency, setCurrency] = useState<Currency>(lang === 'zh' ? 'CNY' : 'USD');

	const toggleCurrency = () => {
		setCurrency((prev) => (prev === 'CNY' ? 'USD' : 'CNY'));
	};

	return (
		<section className='mt-6'>
			<div className='rounded-2xl border border-slate-200/80 bg-white/70 p-4 dark:border-white/10 dark:bg-slate-900/50'>
				<div className='mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white'>
					<Info className='h-4 w-4' />
					<span>{content.warningTitle}</span>
				</div>
				<p className='text-sm leading-relaxed text-slate-600 dark:text-slate-300'>
					{content.warningText}
				</p>
			</div>

			<div className='mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-4'>
				{content.plans.map((plan) => (
					<article
						key={plan.name}
						className={`relative flex h-full flex-col rounded-2xl border bg-white/85 p-6 shadow-sm dark:bg-slate-900/70 ${
							plan.recommended
								? 'border-indigo-500 shadow-[0_10px_40px_-20px_rgba(79,70,229,0.6)]'
								: 'border-slate-200/80 dark:border-white/10'
						}`}>
						{plan.recommended && (
							<Badge className='absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-500 px-3 py-1 text-white'>
								<Star className='mr-1 h-3.5 w-3.5 fill-current' />
								{content.recommendedText}
							</Badge>
						)}

						<div className='flex items-start justify-between gap-3'>
							<h3 className='text-2xl font-semibold text-slate-900 dark:text-white'>
								{plan.name}
							</h3>
							{plan.currencyLabel && (
								<button
									type='button'
									onClick={toggleCurrency}
									className='rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-white/20 dark:text-slate-200 dark:hover:bg-slate-800/60'>
									{plan.currencyLabel}
									<span className='ml-1'>
										{currency === 'CNY' ? content.cnyText : content.usdText}
									</span>
								</button>
							)}
						</div>

						<div className='mt-4 flex items-end gap-1'>
							<p className='text-4xl font-bold tracking-tight text-slate-900 dark:text-white'>
								{plan.custom ? plan.price : plan.prices?.[currency]}
							</p>
							<p className='pb-1 text-xl text-slate-700 dark:text-slate-200'>
								{plan.unit}
							</p>
						</div>

						{plan.custom ? (
							<p className='mt-5 text-sm leading-relaxed text-slate-700 dark:text-slate-200'>
								{plan.description}
							</p>
						) : (
							<ul className='mt-5 space-y-3'>
								{plan.features?.map((feature) => (
									<li key={feature.text} className='flex gap-2 text-sm'>
										<CircleCheckBig className='mt-0.5 h-4 w-4 shrink-0 text-slate-700 dark:text-slate-200' />
										<span className='text-slate-800 dark:text-slate-100'>
											{feature.text}
											{feature.badge && (
												<span className='ml-2 rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200'>
													{feature.badge}
												</span>
											)}
										</span>
									</li>
								))}
							</ul>
						)}

						<div className='mt-auto'>
							<Button asChild className='mt-8 w-full rounded-xl text-sm'>
								<Link href={plan.buttonHref}>{plan.buttonText}</Link>
							</Button>
						</div>
					</article>
				))}
			</div>

			<section className='mt-10'>
				<div className='mb-4'>
					<h3 className='text-2xl font-semibold text-slate-900 dark:text-white'>
						{content.computePackTitle}
					</h3>
					<p className='mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300'>
						{content.computePackDescription}
					</p>
				</div>

				<div className='grid gap-6 md:grid-cols-2 xl:grid-cols-3'>
					{content.computePacks.map((pack) => (
						<article
							key={pack.name}
							className='flex h-full flex-col rounded-2xl border border-slate-200/80 bg-white/85 p-6 shadow-sm dark:border-white/10 dark:bg-slate-900/70'>
							<div className='flex items-start justify-between gap-3'>
								<h3 className='text-2xl font-semibold text-slate-900 dark:text-white'>
									{pack.name}
								</h3>
								<button
									type='button'
									onClick={toggleCurrency}
									className='rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 dark:border-white/10 dark:text-slate-300 dark:hover:border-white/20 dark:hover:text-white'>
									{currency === 'CNY' ? content.usdText : content.cnyText}
								</button>
							</div>

							<div className='mt-6'>
								<div className='text-4xl font-bold tracking-tight text-slate-900 dark:text-white'>
									{pack.prices[currency]}
								</div>
								<div className='mt-1 text-sm text-slate-500 dark:text-slate-400'>
									{pack.unit}
								</div>
							</div>

							<p className='mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300'>
								{pack.description}
							</p>

							<ul className='mt-6 space-y-3 text-sm text-slate-700 dark:text-slate-200'>
								{pack.features.map((feature) => (
									<li key={feature.text} className='flex items-start gap-3'>
										<CircleCheckBig className='mt-0.5 h-4 w-4 shrink-0 text-emerald-500' />
										<div className='flex min-w-0 items-center gap-2'>
											<span>{feature.text}</span>
											{feature.badge && (
												<Badge
													variant='secondary'
													className='rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700 dark:bg-white/10 dark:text-slate-200'>
													{feature.badge}
												</Badge>
											)}
										</div>
									</li>
								))}
							</ul>

							<div className='mt-auto pt-8'>
								<Button asChild className='w-full rounded-xl'>
									<Link href={pack.buttonHref}>{pack.buttonText}</Link>
								</Button>
							</div>
						</article>
					))}
				</div>
			</section>
		</section>
	);
};

export default PricingPlans;
