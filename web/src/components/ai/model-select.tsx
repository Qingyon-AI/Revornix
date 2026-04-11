'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import type { Model } from '@/generated';

import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { isModelSubscriptionLocked } from '@/lib/subscription';
import { useUserContext } from '@/provider/user-provider';
import { searchAiModel } from '@/service/ai';

type Props = {
	value?: number | null;
	onChange: (id: number) => void;
	disabled?: boolean;
	className?: string;
	placeholder?: string;
	size?: 'sm' | 'default';
	variant?: 'inline' | 'panel';
};

type ProviderGroup = {
	id: number;
	name: string;
	models: Model[];
};

const AIModelSelect = ({
	value,
	onChange,
	disabled = false,
	className,
	placeholder,
	size = 'default',
	variant = 'panel',
}: Props) => {
	const t = useTranslations();
	const { mainUserInfo, paySystemUserInfo } = useUserContext();
	const { data } = useQuery({
		queryKey: ['aiModelSelect', 'all'],
		queryFn: () =>
			searchAiModel({
				keyword: '',
			}),
	});

	const groupedModels = useMemo(() => {
		const providerMap = new Map<number, ProviderGroup>();
		for (const model of data?.data ?? []) {
			const providerId = model.provider.id;
			const existing = providerMap.get(providerId);
			if (existing) {
				existing.models.push(model);
				continue;
			}
			providerMap.set(providerId, {
				id: providerId,
				name: model.provider.name,
				models: [model],
			});
		}
		return Array.from(providerMap.values());
	}, [data?.data]);

	return (
		<Select
			value={value ? String(value) : undefined}
			onValueChange={(next) => onChange(Number(next))}
			disabled={disabled}>
			<SelectTrigger
				size={size}
				className={
					variant === 'inline'
						? `h-8 min-h-8 rounded-full border-0 bg-transparent! px-0 py-0 text-xs shadow-none focus-visible:ring-0 ${className ?? ''}`
						: `h-10 rounded-[18px] border-border/60 px-3.5 shadow-none transition-colors hover:bg-background ${className ?? ''}`
				}>
				<SelectValue placeholder={placeholder ?? t('setting_model_select')} />
			</SelectTrigger>
			<SelectContent className='min-w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-2rem)] rounded-[18px] border-border/60 bg-popover/98 shadow-[0_18px_48px_-24px_rgba(15,23,42,0.35)] backdrop-blur'>
				<SelectGroup>
					{groupedModels.map((provider) => (
						<div key={provider.id}>
							<SelectLabel className='text-xs text-muted-foreground'>
								{provider.name}
							</SelectLabel>
							{provider.models.map((model) => (
								<SelectItem
									key={model.id}
									value={String(model.id)}
									disabled={isModelSubscriptionLocked(
										model.required_plan_level,
										model.provider.creator.id,
										paySystemUserInfo,
										mainUserInfo,
									)}>
									{model.name}
								</SelectItem>
							))}
						</div>
					))}
				</SelectGroup>
			</SelectContent>
		</Select>
	);
};

export default AIModelSelect;
