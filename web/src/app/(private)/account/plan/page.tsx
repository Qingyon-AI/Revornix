import CustomPlan from '@/components/plan/custom-plan';
import PlanCard from '@/components/plan/plan-card';
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
	return (
		<div className='pb-5 px-5 flex flex-col justify-center w-full'>
			<h1 className='text-2xl font-bold mb-2'>{t('account_plan')}</h1>
			<Alert className='mb-5'>
				<Info className='size-4' />
				<AlertTitle>{t('warning')}</AlertTitle>
				<AlertDescription>{t('account_plan_tips')}</AlertDescription>
			</Alert>
			<div className='grid-cols-1 md:grid-cols-4 grid gap-5 mb-5'>
				<PlanCard product_uuid={'213408a40f5f4cfdaeca8d4c28ccd822'} />
				<PlanCard
					product_uuid={'a00a68fbfdbc4159a67610858b43e2e8'}
					badge={t('account_plan_user_prefer')}
				/>
				<PlanCard product_uuid={'c5d27327384543a8b952d3f52a2120f0'} />
				<CustomPlan />
			</div>
		</div>
	);
};

export default ProPage;
