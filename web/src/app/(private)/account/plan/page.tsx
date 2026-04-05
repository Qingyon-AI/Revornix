import CustomPlan from '@/components/plan/custom-plan';
import ComputeLedgerTable from '@/components/plan/compute-ledger-table';
import ComputePackSummary from '@/components/plan/compute-pack-summary';
import PlanCard, { IntroduceAbility } from '@/components/plan/plan-card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ComputePack } from '@/enums/product';
import { PrePayProductRequestDTOCategoryEnum } from '@/generated-pay';
import { isAllowedDeployHost } from '@/lib/utils';
import { Info } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';

const ProPage = async () => {
	const headersList = await headers();
	const host = headersList.get('host');

	// ✅ 如果 host 不是官方部署的服务，直接 404
	if (!host || !isAllowedDeployHost(host)) {
		notFound();
	}

	const t = await getTranslations();

	const free_introduction_abilities: IntroduceAbility[] = [
		{
			name: 'Bring your own model and engine integration.',
			name_zh: '支持接入自己的模型和引擎',
		},
		{
			name: 'Capture links and files.',
			name_zh: '收录链接与文件',
			tag: '20 each',
		},
		{
			name: 'Capture quick notes.',
			name_zh: '收录速记',
		},
		{
			name: 'Document reading queue and multi-device sync.',
			name_zh: '文档待读记录与多端同步',
		},
		{
			name: 'AI summarization and Revornix AI with self-configured models.',
			name_zh: 'AI 总结与 Revornix AI（需自配模型）',
		},
		{
			name: 'Illustration and podcast generation with self-configured engines.',
			name_zh: '专栏插图与播客生成（需自配引擎）',
		},
		{
			name: 'Trending topics overview.',
			name_zh: '各大平台热搜一览',
		},
		{
			name: 'API endpoint ingestion.',
			name_zh: 'API 接口收录',
			tag: '10 / day',
		},
		{
			name: 'MCP Client.',
			name_zh: 'MCP 客户端',
		},
	];

	const pro_introduction_abilities: IntroduceAbility[] = [
		{
			name: 'Everything in Free, with official hosted AI access.',
			name_zh: '包含 Free 全部能力，并可使用官方托管 AI',
		},
		{
			name: 'Document and section knowledge graph.',
			name_zh: '文档与专栏知识图谱',
		},
		{
			name: 'Monthly hosted point allowance shared across official AI features.',
			name_zh: '每月包含可共享使用的官方总积分额度',
			tag: '4.3M pts',
		},
		{
			name: 'Based on the current default hosted stack, roughly equal to one standard monthly mix across Revornix AI, Banana Image, and Volc Podcast Engine.',
			name_zh: '按当前默认官方组合计费，约等于 1 份标准月组合额度，可覆盖 Revornix AI、Banana Image 与豆包播客引擎的常见使用。',
		},
		{
			name: 'API endpoint ingestion.',
			name_zh: 'API 接口收录',
			tag: '25 / day',
		},
		{
			name: 'Multi-user section collaboration.',
			name_zh: '专栏多人协作',
		},
		{
			name: 'MCP Client and MCP Server.',
			name_zh: 'MCP 客户端与 MCP 服务端',
		},
	];

	const max_introduction_abilities: IntroduceAbility[] = [
		{
			name: 'Everything in Pro, tuned for creators and heavy users.',
			name_zh: '包含 Pro 全部能力，面向创作者与重度用户',
		},
		{
			name: 'Larger monthly hosted point allowance shared across official AI features.',
			name_zh: '更多的每月官方总积分额度',
			tag: '17.2M pts',
		},
		{
			name: 'Based on the current default hosted stack, roughly equal to four standard monthly mixes across Revornix AI, Banana Image, and Volc Podcast Engine.',
			name_zh: '按当前默认官方组合计费，约等于 4 份标准月组合额度，可覆盖更高频的 Revornix AI、Banana Image 与豆包播客引擎使用。',
		},
		{
			name: 'API endpoint ingestion.',
			name_zh: 'API 接口收录',
			tag: '50 / day',
		},
		{
			name: 'Multi-user section collaboration.',
			name_zh: '专栏多人协作',
		},
		{
			name: 'MCP Client and MCP Server.',
			name_zh: 'MCP 客户端与 MCP 服务端',
		},
	];

	const starter_compute_pack_abilities: IntroduceAbility[] = [
		{
			name: 'Top up official hosted AI overage.',
			name_zh: '用于补充官方托管 AI 的超额消耗',
		},
		{
			name: 'General-purpose points for official LLM, image, and podcast usage.',
			name_zh: '通用于官方 LLM、插图、播客等场景',
			tag: '500k pts',
		},
	];

	const growth_compute_pack_abilities: IntroduceAbility[] = [
		{
			name: 'Balanced top-up pack for active users.',
			name_zh: '适合活跃用户的均衡型补充包',
		},
		{
			name: 'General-purpose points for official LLM, image, and podcast usage.',
			name_zh: '通用于官方 LLM、插图、播客等场景',
			tag: '2M pts',
		},
	];

	const scale_compute_pack_abilities: IntroduceAbility[] = [
		{
			name: 'High-capacity top-up pack for creators and automation-heavy usage.',
			name_zh: '适合创作者与高频自动化的高容量补充包',
		},
		{
			name: 'General-purpose points for official LLM, image, and podcast usage.',
			name_zh: '通用于官方 LLM、插图、播客等场景',
			tag: '8M pts',
		},
	];

	return (
		<div className='pb-5 px-5 flex flex-col justify-center w-full'>
			<h1 className='text-2xl font-bold mb-2'>{t('account_plan')}</h1>
			<Alert className='mb-5'>
				<Info className='size-4' />
				<AlertTitle>{t('warning')}</AlertTitle>
				<AlertDescription>{t('account_plan_tips')}</AlertDescription>
			</Alert>
			<Alert className='mb-5'>
				<Info className='size-4' />
				<AlertTitle>{t('account_plan_subscription_notes_title')}</AlertTitle>
				<AlertDescription className='space-y-2'>
					<p>{t('account_plan_subscription_notes_checkout')}</p>
					<p>{t('account_plan_subscription_notes_points')}</p>
				</AlertDescription>
			</Alert>
			<div className='grid-cols-1 md:grid-cols-4 grid gap-5 mb-5'>
				<PlanCard
					product_uuid={'213408a40f5f4cfdaeca8d4c28ccd822'}
					description='For trial, BYO-model usage, and light personal workflows.'
					description_zh='适合试用、自带模型使用和轻量个人工作流。'
					footnote='Free is designed for BYO-model workflows. Official hosted AI starts from Pro, and overage can be extended with compute packs.'
					footnote_zh='Free 更适合自带模型工作流。官方托管 AI 从 Pro 开始提供，超额部分可通过算力包补充。'
					introduction_abilities={free_introduction_abilities}
				/>
				<PlanCard
					product_uuid={'0a3e8009849f4e4383f19dc687c225ec'}
					badge={t('account_plan_user_prefer')}
					description='The main paid tier for most users, with clear hosted AI allowance and collaboration.'
					description_zh='面向大多数用户的主力付费档，包含明确的官方 AI 月额度与基础协作能力。'
					footnote='Monthly hosted quota is included. Hosted points from plans and compute packs are deducted by the nearest expiration time first.'
					footnote_zh='订阅内已包含月度官方算力额度。会员赠送点数与算力包点数会按最早到期时间优先消耗。'
					introduction_abilities={pro_introduction_abilities}
				/>
				<PlanCard
					product_uuid={'372b0794e3b443b68a0db6a2e6d78f0a'}
					description='Built for creators, heavy automation, and teams that need more official AI capacity.'
					description_zh='适合创作者、高频自动化和需要更高官方 AI 容量的重度用户。'
					footnote='Max is designed to be the profitable heavy-usage tier and should absorb most high-frequency official AI demand.'
					footnote_zh='Max 定位为高频使用下的盈利档位，用来承接大多数高成本官方 AI 消耗。'
					introduction_abilities={max_introduction_abilities}
				/>
				<CustomPlan />
			</div>
			<div id='compute-pack' className='flex flex-col gap-3 mb-5 scroll-mt-24'>
				<h2 className='text-xl font-semibold'>{t('account_plan_compute_pack_title')}</h2>
				<p className='text-sm text-muted-foreground'>
					{t('account_plan_compute_pack_description')}
				</p>
				<ComputePackSummary />
			</div>
			<div className='grid-cols-1 md:grid-cols-3 grid gap-5'>
				<PlanCard
					product_uuid={ComputePack.STARTER}
					category={PrePayProductRequestDTOCategoryEnum.ComputePack}
					actionLabel={t('account_plan_buy_compute_pack')}
					description='A low-risk top-up for small bursts of official AI usage.'
					description_zh='适合小规模尝试和轻量补充的低门槛算力包。'
					footnote='Compute packs are one-time purchases. Hosted points are deducted by the nearest expiration time first, and purchased points remain valid for 3 months.'
					footnote_zh='算力包为一次性购买。系统会按最早到期时间优先消耗点数，购买后的点数有效期为 3 个月。'
					introduction_abilities={starter_compute_pack_abilities}
				/>
				<PlanCard
					product_uuid={ComputePack.GROWTH}
					category={PrePayProductRequestDTOCategoryEnum.ComputePack}
					actionLabel={t('account_plan_buy_compute_pack')}
					description='The main top-up pack for users who regularly exceed Pro monthly allowance.'
					description_zh='适合经常超出 Pro 月额度的主力补充包。'
					footnote='A one-time top-up pack that pairs well with Pro when you want more official AI usage without raising the recurring subscription fee. Points are deducted by the nearest expiration time first and remain valid for 3 months after purchase.'
					footnote_zh='这是一次性补充包，适合与 Pro 搭配，在不提高固定月费的前提下补充更多官方 AI 使用量。点数会按最早到期时间优先消耗，购买后的点数有效期为 3 个月。'
					introduction_abilities={growth_compute_pack_abilities}
				/>
				<PlanCard
					product_uuid={ComputePack.SCALE}
					category={PrePayProductRequestDTOCategoryEnum.ComputePack}
					actionLabel={t('account_plan_buy_compute_pack')}
					description='The heavy-duty top-up for creators, production workflows, and large official AI demand.'
					description_zh='适合创作者、生产流和大规模官方 AI 需求的重度补充包。'
					footnote='A one-time large-capacity top-up for creator and production workflows. Points are deducted by the nearest expiration time first and remain valid for 3 months after purchase.'
					footnote_zh='这是一次性大容量补充包，适合创作者与生产流。点数会按最早到期时间优先消耗，购买后的点数有效期为 3 个月。'
					introduction_abilities={scale_compute_pack_abilities}
				/>
			</div>
			<div className='mt-8 flex flex-col gap-3'>
				<h2 className='text-xl font-semibold'>{t('account_compute_ledger_title')}</h2>
				<p className='text-sm text-muted-foreground'>
					{t('account_compute_ledger_browse_hint')}
				</p>
				<ComputeLedgerTable />
			</div>
		</div>
	);
};

export default ProPage;
