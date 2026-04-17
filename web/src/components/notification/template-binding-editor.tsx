'use client';

import { useEffect, useMemo } from 'react';
import type {
	NotificationTemplateItem,
	NotificationTemplateParameterBinding,
	TriggerEventItem,
} from '@/service/notification';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';

type Props = {
	locale: string;
	template?: NotificationTemplateItem;
	triggerEvent?: TriggerEventItem;
	bindings?: Record<string, NotificationTemplateParameterBinding>;
	onChange: (
		bindings: Record<string, NotificationTemplateParameterBinding>,
	) => void;
	title: string;
	emptyText: string;
	sourceLabel: string;
	eventOptionLabel: string;
	staticOptionLabel: string;
	attributeLabel: string;
	staticValueLabel: string;
};

const TemplateBindingEditor = ({
	locale,
	template,
	triggerEvent,
	bindings,
	onChange,
	title,
	emptyText,
	sourceLabel,
	eventOptionLabel,
	staticOptionLabel,
	attributeLabel,
	staticValueLabel,
}: Props) => {
	const eventAttributes = triggerEvent?.attributes ?? [];
	const canUseEventSource = eventAttributes.length > 0;

	const normalizedBindings = useMemo(() => {
		const nextBindings = { ...(bindings ?? {}) };
		let changed = false;

		for (const parameter of template?.parameters ?? []) {
			const currentBinding = nextBindings[parameter.key];
			if (!currentBinding) {
				continue;
			}
			if (currentBinding.source_type === 'event' && !canUseEventSource) {
				nextBindings[parameter.key] = {
					source_type: 'static',
					static_value: currentBinding.static_value ?? '',
				};
				changed = true;
			}
		}

		return changed ? nextBindings : (bindings ?? {});
	}, [bindings, canUseEventSource, template?.parameters]);

	useEffect(() => {
		if (normalizedBindings !== (bindings ?? {})) {
			onChange(normalizedBindings);
		}
	}, [bindings, normalizedBindings, onChange]);

	if (!template || template.parameters.length === 0) {
		return <p className='text-sm text-muted-foreground'>{emptyText}</p>;
	}

	return (
		<div className='space-y-3 rounded-2xl border border-border/60 bg-background/70 p-4'>
			<div className='flex items-center justify-between gap-3'>
				<div className='space-y-1'>
					<Label>{title}</Label>
					<p className='text-xs text-muted-foreground'>
						{canUseEventSource ? sourceLabel : staticValueLabel}
					</p>
				</div>
				<Badge
					variant='secondary'
					className='rounded-full px-3 py-1 shadow-none'>
					{template.parameters.length}
				</Badge>
			</div>
			<div className='space-y-2'>
				{template.parameters.map((parameter) => {
					const currentBinding = normalizedBindings[parameter.key] ?? {
						source_type: canUseEventSource
							? ('event' as const)
							: ('static' as const),
						static_value: parameter.default_value ?? '',
					};
					const parameterLabel = parameter.label;
					const resolvedSourceType = canUseEventSource
						? currentBinding.source_type
						: 'static';
					return (
						<div
							key={parameter.key}
							className='grid gap-3 rounded-xl border border-border/50 bg-muted/10 p-3 md:grid-cols-[minmax(0,180px)_minmax(0,1fr)]'>
							<div className='min-w-0 space-y-1 flex flex-col justify-center'>
								<div className='flex items-center gap-2'>
									<p className='truncate font-medium'>{parameterLabel}</p>
								</div>
								<p className='truncate text-xs text-muted-foreground'>
									{parameter.key}
								</p>
							</div>
							<div className='grid gap-3 md:grid-cols-[180px_minmax(0,1fr)]'>
								<div className='space-y-2'>
									<Label className='text-xs text-muted-foreground'>
										{sourceLabel}
									</Label>
									{canUseEventSource ? (
										<div className='inline-flex rounded-xl border border-border/60 bg-background p-1'>
											<Button
												type='button'
												size='sm'
												variant={
													resolvedSourceType === 'event' ? 'secondary' : 'ghost'
												}
												className='h-8 rounded-lg px-3 text-xs'
												onClick={() =>
													onChange({
														...normalizedBindings,
														[parameter.key]: {
															...currentBinding,
															source_type: 'event',
														},
													})
												}>
												{eventOptionLabel}
											</Button>
											<Button
												type='button'
												size='sm'
												variant={
													resolvedSourceType === 'static'
														? 'secondary'
														: 'ghost'
												}
												className='h-8 rounded-lg px-3 text-xs'
												onClick={() =>
													onChange({
														...normalizedBindings,
														[parameter.key]: {
															...currentBinding,
															source_type: 'static',
															static_value:
																currentBinding.static_value ??
																parameter.default_value ??
																'',
														},
													})
												}>
												{staticOptionLabel}
											</Button>
										</div>
									) : (
										<div className='flex h-10 items-center rounded-xl border border-dashed border-border/60 px-3 text-xs text-muted-foreground'>
											{staticOptionLabel}
										</div>
									)}
								</div>
								<div className='space-y-2'>
									<Label className='text-xs text-muted-foreground'>
										{resolvedSourceType === 'event'
											? attributeLabel
											: staticValueLabel}
									</Label>
									{resolvedSourceType === 'event' ? (
										<Select
											value={currentBinding.attribute_key ?? ''}
											onValueChange={(value) =>
												onChange({
													...normalizedBindings,
													[parameter.key]: {
														...currentBinding,
														source_type: 'event',
														attribute_key: value,
													},
												})
											}>
											<SelectTrigger className='h-10 w-full'>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{eventAttributes.map((attribute) => (
													<SelectItem key={attribute.key} value={attribute.key}>
														{locale === 'zh'
															? attribute.label_zh || attribute.label
															: attribute.label}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
									) : (
										<Input
											value={currentBinding.static_value ?? ''}
											placeholder={parameter.default_value ?? ''}
											onChange={(event) =>
												onChange({
													...normalizedBindings,
													[parameter.key]: {
														...currentBinding,
														source_type: 'static',
														static_value: event.target.value,
													},
												})
											}
											className='h-10'
										/>
									)}
								</div>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};

export default TemplateBindingEditor;
