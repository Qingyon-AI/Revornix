'use client';

import { Card } from '../ui/card';
import SectionGraph from './section-graph';
import SectionInfo from './section-info';
import SectionMarkdown from './section-markdown';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '../ui/dialog';
import { useTranslations } from 'next-intl';
import { Button } from '../ui/button';
import { Expand } from 'lucide-react';

const SectionContainer = ({ id }: { id: number }) => {
	const t = useTranslations();
	return (
		<div className='px-5 pb-5 h-full w-full grid grid-cols-12 gap-5 relative'>
			<div className='col-span-8 h-full relative min-h-0'>
				<SectionMarkdown id={id} />
			</div>

			<div className='col-span-4 py-0 h-full flex flex-col gap-5 min-h-0 relative'>
				<Card className='py-0 flex-1 overflow-auto relative pb-5'>
					<div>
						<SectionInfo id={id} />
					</div>
				</Card>
				<Card className='py-0 flex-1 relative'>
					<Dialog>
						<DialogTrigger asChild>
							<Button
								className='absolute top-2 left-2 z-10'
								size={'icon'}
								variant={'outline'}>
								<Expand size={4} className='text-muted-foreground' />
							</Button>
						</DialogTrigger>
						<DialogContent className='!max-w-[80vw] h-[80vh] flex flex-col'>
							<DialogHeader>
								<DialogTitle>{t('section_graph')}</DialogTitle>
								<DialogDescription>
									{t('section_graph_description')}
								</DialogDescription>
							</DialogHeader>
							<div className='flex-1'>
								<SectionGraph section_id={id} />
							</div>
						</DialogContent>
					</Dialog>

					<SectionGraph section_id={id} />
				</Card>
			</div>
		</div>
	);
};

export default SectionContainer;
