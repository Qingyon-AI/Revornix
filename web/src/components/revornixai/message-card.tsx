import { cn } from '@/lib/utils';
import { Message } from '@/types/ai';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import CustomImage from '../ui/custom-image';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@/components/ui/accordion';
import {
	CheckCircle2Icon,
	PenLineIcon,
	SparkleIcon,
	WrenchIcon,
	XCircleIcon,
} from 'lucide-react';
import { isEmpty } from 'lodash-es';

const MessageCard = ({ message }: { message: Message }) => {
	const ai_workflow = message.ai_workflow;
	const ai_state = message.ai_state;
	return (
		<div
			className={cn('flex flex-row gap-5', {
				'justify-end': message.role === 'user',
			})}>
			<div className='flex flex-col gap-2'>
				<div className='rounded-lg p-3 w-fit bg-muted min-w-3xl'>
					{ai_state && (
						<Alert className='mb-5'>
							<AlertDescription>
								<Accordion type='multiple' className='w-full'>
									<AccordionItem value='state'>
										<AccordionTrigger className='py-0'>
											<div className='flex flex-row gap-2 items-center'>
												{ai_state.phase === 'thinking' && (
													<SparkleIcon size={12} />
												)}
												{ai_state.phase === 'writing' && (
													<PenLineIcon size={12} />
												)}
												{ai_state.phase === 'tool' && <WrenchIcon size={12} />}
												{ai_state.phase === 'done' && (
													<CheckCircle2Icon size={12} />
												)}
												{ai_state.phase === 'error' && (
													<XCircleIcon size={12} />
												)}
												<AlertTitle className='font-bold text-primary'>
													{ai_state?.label && ai_state.label}
												</AlertTitle>
											</div>
										</AccordionTrigger>
										<AccordionContent className='pb-0 mt-2'>
											{ai_workflow && (
												<div className='space-y-1'>
													<div className='relative pl-5'>
														{/* 竖线 */}
														<div className='absolute left-1.5 top-0 bottom-0 w-px bg-border' />

														<div className='space-y-2'>
															{ai_workflow.map((step, index) => {
																return (
																	<div
																		className='flex flex-col text-xs'
																		key={index}>
																		<div className='flex flex-row items-center gap-2'>
																			{step.phase === 'thinking' && (
																				<SparkleIcon size={12} />
																			)}
																			{step.phase === 'writing' && (
																				<PenLineIcon size={12} />
																			)}
																			{step.phase === 'tool' && (
																				<WrenchIcon size={12} />
																			)}
																			{step.phase === 'tool_result' && (
																				<WrenchIcon size={12} />
																			)}
																			{step.phase === 'done' && (
																				<CheckCircle2Icon size={12} />
																			)}
																			{step.phase === 'error' && (
																				<XCircleIcon size={12} />
																			)}
																			<span>{step.label}</span>
																		</div>

																		{!isEmpty(step.meta) && (
																			<div className='pl-5 mt-1 w-fit'>
																				{step.phase === 'tool_result' &&
																					step.meta?.result && (
																						<div className='bg-muted px-1 py-0.5 rounded break-all'>
																							{step.meta.result}
																						</div>
																					)}
																				{step.phase === 'tool' &&
																					step.meta?.tool && (
																						<div className='bg-muted px-1 py-0.5 rounded break-all'>
																							{step.meta.tool}
																						</div>
																					)}
																			</div>
																		)}
																	</div>
																);
															})}
														</div>
													</div>
												</div>
											)}
										</AccordionContent>
									</AccordionItem>
								</Accordion>
							</AlertDescription>
						</Alert>
					)}

					<div className='prose dark:prose-invert max-w-none'>
						<Markdown
							components={{
								img: (props) => {
									return <CustomImage {...props} />;
								},
							}}
							remarkPlugins={[remarkMath, remarkGfm]}
							rehypePlugins={[rehypeKatex, rehypeRaw]}>
							{message.content}
						</Markdown>
					</div>
				</div>
			</div>
		</div>
	);
};
export default MessageCard;
