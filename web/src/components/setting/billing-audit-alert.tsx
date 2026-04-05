'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ShieldAlert } from 'lucide-react';
import { useTranslations } from 'next-intl';

export type BillingAuditIssue = {
	code: string;
	severity: string;
	resource_id: number;
	resource_uuid: string;
	resource_name: string;
	provider_name?: string | null;
	title: string;
	description: string;
};

interface BillingAuditAlertProps {
	title: string;
	description: string;
	items: BillingAuditIssue[];
}

const BillingAuditAlert = ({
	title,
	description,
	items,
}: BillingAuditAlertProps) => {
	const t = useTranslations();

	if (!items.length) {
		return null;
	}

	return (
		<Alert className='border-amber-500/30 bg-amber-500/10 text-amber-200'>
			<ShieldAlert className='size-4' />
			<AlertTitle>{title}</AlertTitle>
			<AlertDescription className='space-y-3'>
				<p>{description}</p>
				<div className='space-y-2'>
					{items.map((item) => (
						<div
							key={`${item.code}-${item.resource_uuid}`}
							className='rounded-lg border border-white/10 bg-black/20 p-3'
						>
							<div className='flex flex-wrap items-center gap-2'>
								<span className='font-medium text-white'>{item.resource_name}</span>
								<Badge variant='secondary'>
									{t(`billing_audit_severity_${item.severity}`)}
								</Badge>
								{item.provider_name ? (
									<span className='text-xs text-muted-foreground'>
										{item.provider_name}
									</span>
								) : null}
							</div>
							<p className='mt-1 text-sm font-medium text-white'>{item.title}</p>
							<p className='mt-1 text-sm text-muted-foreground'>
								{item.description}
							</p>
						</div>
					))}
				</div>
			</AlertDescription>
		</Alert>
	);
};

export default BillingAuditAlert;
