'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

/**
 * Renders the `detail` a task node recorded for its current status — usually the
 * error message of a failed run. It stays inside the task's own card so one
 * broken node never leaks into the document's title or description.
 */
const TaskDetailMessage = ({
	detail,
	className,
}: {
	detail?: string | null;
	className?: string;
}) => {
	const t = useTranslations();
	const message = detail?.trim();

	if (!message) {
		return null;
	}

	return (
		<div className={cn('space-y-1', className)}>
			<div className='text-[11px] font-semibold uppercase tracking-wide opacity-70'>
				{t('task_detail')}
			</div>
			<pre className='max-h-40 overflow-auto whitespace-pre-wrap break-all font-mono text-xs leading-6'>
				{message}
			</pre>
		</div>
	);
};

/**
 * Convenience wrapper for `SidebarTaskNode`'s `hint` slot: returns `undefined`
 * when there is nothing to show, so the notice box is not rendered empty.
 */
export const taskDetailHint = (detail?: string | null) =>
	detail?.trim() ? <TaskDetailMessage detail={detail} /> : undefined;

export default TaskDetailMessage;
