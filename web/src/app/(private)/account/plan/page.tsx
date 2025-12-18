import CustomPlan from '@/components/plan/custom-plan';
import PlanCard, { IntroduceAbility } from '@/components/plan/plan-card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';

const ProPage = async () => {
	const headersList = await headers();
	const host = headersList.get('host');

	// ✅ 如果 host 是 das，直接 404
	if (
		!host?.includes('app.revornix.com') &&
		!host?.includes('app.revornix.cn')
	) {
		notFound();
	}

	const t = await getTranslations();

	const free_introduction_abilities: IntroduceAbility[] = [
		{
			name: 'Capture links, files.',
			name_zh: '收录链接、文件',
			tag: '20 each',
		},
		{
			name: 'Capture quick notes.',
			name_zh: '收录速记',
		},
		{
			name: 'Document reading queue.',
			name_zh: '文档待读记录',
		},
		{
			name: 'Multi-device sync.',
			name_zh: '多端同步',
		},
		{
			name: 'AI-powered summarization (requires self-configured model).',
			name_zh: 'AI智能总结（需要自行配置模型）',
		},
		{
			name: 'Section illustration generation (requires self-configured model).',
			name_zh: '专栏插图生成（需要自行配置模型）',
		},
		{
			name: 'Revornix AI (requires self-configured model).',
			name_zh: 'Revornix AI（需要自行配置模型）',
		},
		{
			name: 'Overview of trending topics across major platforms.',
			name_zh: '各大平台热搜一览',
		},
		{
			name: 'Automatically push the day’s trending topics and knowledge base summary (requires self-configured model).',
			name_zh: '自动推送当天热搜以及知识库总结（需要自行配置模型）',
		},
		{
			name: 'API endpoint ingestion.',
			name_zh: 'API接口收录',
			tag: '10 times / day',
		},
		{
			name: 'MCP Client',
			name_zh: 'MCP 客户端',
		},
		{
			name: 'Automatically generate podcasts for sections/documents (requires self-configured model).',
			name_zh:
				'自动生成专栏/文档的播客（需要自行配置模型）',
		},
	];

	const pro_introduction_abilities: IntroduceAbility[] = [
		{
			name: 'Capture links, files, and quick notes.',
			name_zh: '收录链接、文件、速记',
		},
		{
			name: 'RSS subscription.',
			name_zh: 'RSS订阅',
		},
		{
			name: 'Document reading queue.',
			name_zh: '文档待读记录',
		},
		{
			name: 'Document/section knowledge graph.',
			name_zh: '文档/专栏知识图谱',
		},
		{
			name: 'Multi-device sync.',
			name_zh: '多端同步',
		},
		{
			name: 'AI-powered summarization (with limited access to Revornix’s official models).',
			name_zh: 'AI智能总结（可有限度的使用Revornix官方提供的模型接入）',
		},
		{
			name: 'Section illustration generation (with limited access to Revornix’s official models).',
			name_zh: '专栏插图生成（可有限度的使用Revornix官方提供的模型接入）',
		},
		{
			name: 'Revornix AI (with limited access to Revornix’s official models).',
			name_zh: 'Revornix AI（可有限度的使用Revornix官方提供的模型接入）',
		},
		{
			name: 'Overview of trending topics across major platforms.',
			name_zh: '各大平台热搜一览',
		},
		{
			name: 'Automatically push the day’s trending topics and knowledge base summary (with limited access to Revornix’s official models).',
			name_zh:
				'自动推送当天热搜以及知识库总结（可有限度的使用Revornix官方提供的模型接入）',
		},
		{
			name: 'API endpoint ingestion.',
			name_zh: 'API接口收录',
			tag: '25 times / day',
		},
		{
			name: 'MCP Client and MCP Server.',
			name_zh: 'MCP 客户端和服务端',
		},
		{
			name: 'Automatically generate podcasts for sections/documents (with limited access to Revornix’s official models).',
			name_zh:
				'自动生成专栏/文档的播客（可有限度的使用Revornix官方提供的模型接入）',
		},
		{
			name: 'Section collaboration by multiple users.',
			name_zh: '专栏多人协作',
		},
	];

	const max_introduction_abilities: IntroduceAbility[] = [
		{
			name: 'Capture links, files, and quick notes.',
			name_zh: '收录链接、文件、速记',
		},
		{
			name: 'RSS subscription.',
			name_zh: 'RSS订阅',
		},
		{
			name: 'Document reading queue.',
			name_zh: '文档待读记录',
		},
		{
			name: 'Document/section knowledge graph.',
			name_zh: '文档/专栏知识图谱',
		},
		{
			name: 'Multi-device sync.',
			name_zh: '多端同步',
		},
		{
			name: 'AI-powered summarization (with broader access to Revornix’s official model integration).',
			name_zh: 'AI智能总结（可较高限度的使用Revornix官方提供的模型接入）',
		},
		{
			name: 'Section illustration generation (with broader access to Revornix’s official model integration).',
			name_zh: '专栏插图生成（可较高限度的使用Revornix官方提供的模型接入）',
		},
		{
			name: 'Revornix AI (with broader access to Revornix’s official model integration).',
			name_zh: 'Revornix AI（可较高限度的使用Revornix官方提供的模型接入）',
		},
		{
			name: 'Overview of trending topics across major platforms.',
			name_zh: '各大平台热搜一览',
		},
		{
			name: 'Automatically push the day’s trending topics and knowledge base summary (with broader access to Revornix’s official model integration).',
			name_zh:
				'自动推送当天热搜以及知识库总结（可较高限度的使用Revornix官方提供的模型接入）',
		},
		{
			name: 'API endpoint ingestion.',
			name_zh: 'API接口收录',
			tag: '50 times / day',
		},
		{
			name: 'MCP Client and MCP Server.',
			name_zh: 'MCP 客户端和服务端',
		},
		{
			name: 'Automatically generate podcasts for sections/documents (with broader access to Revornix’s official model integration).',
			name_zh:
				'自动生成专栏/文档的播客（可较高限度的使用Revornix官方提供的模型接入）',
		},
		{
			name: 'Section collaboration by multiple users.',
			name_zh: '专栏多人协作',
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
			<div className='grid-cols-1 md:grid-cols-4 grid gap-5 mb-5'>
				<PlanCard
					product_uuid={'213408a40f5f4cfdaeca8d4c28ccd822'}
					introduction_abilities={free_introduction_abilities}
				/>
				<PlanCard
					product_uuid={'a00a68fbfdbc4159a67610858b43e2e8'}
					badge={t('account_plan_user_prefer')}
					introduction_abilities={pro_introduction_abilities}
				/>
				<PlanCard
					product_uuid={'c5d27327384543a8b952d3f52a2120f0'}
					introduction_abilities={max_introduction_abilities}
				/>
				<CustomPlan />
			</div>
		</div>
	);
};

export default ProPage;
