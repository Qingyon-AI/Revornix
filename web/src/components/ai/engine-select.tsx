'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';

import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { EngineCategory } from '@/enums/engine';
import { isSubscriptionLocked } from '@/lib/subscription';
import { useUserContext } from '@/provider/user-provider';
import { searchUableEngines } from '@/service/engine';

type Props = {
	category: EngineCategory;
	value?: number | null;
	onChange: (id: number) => void;
	disabled?: boolean;
	className?: string;
	placeholder?: string;
	size?: 'sm' | 'default';
	variant?: 'inline' | 'panel';
};

const EngineSelect = ({
	category,
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
		queryKey: ['engineSelect', category],
		queryFn: () =>
			searchUableEngines({
				filter_category: category,
			}),
	});

	return (
		<Select
			value={value ? String(value) : undefined}
			onValueChange={(next) => onChange(Number(next))}
			disabled={disabled}>
			<SelectTrigger
				size={size}
				className={
					variant === 'inline'
						? `h-8 min-h-8 rounded-full border-0 bg-transparent px-0 py-0 text-sm shadow-none focus-visible:ring-0 ${className ?? ''}`
						: `h-10 rounded-[18px] border-border/60 bg-background/70 px-3.5 shadow-none transition-colors hover:bg-background ${className ?? ''}`
				}>
				<SelectValue
					placeholder={placeholder ?? t('setting_default_engine_choose')}
				/>
			</SelectTrigger>
			<SelectContent className='min-w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-2rem)] rounded-[18px] border-border/60 bg-popover/98 shadow-[0_18px_48px_-24px_rgba(15,23,42,0.35)] backdrop-blur'>
				<SelectGroup>
					{(data?.data ?? []).map((engine) => (
						<SelectItem
							key={engine.id}
							value={String(engine.id)}
							disabled={isSubscriptionLocked(
								engine.required_plan_level,
								paySystemUserInfo,
								mainUserInfo,
							)}>
							{engine.name}
						</SelectItem>
					))}
				</SelectGroup>
			</SelectContent>
		</Select>
	);
};

export default EngineSelect;
