import AddFile from '@/components/document/add-file';
import AddLink from '@/components/document/add-link';
import AddQuickNote from '@/components/document/add-quick-note';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const CreatePage = () => {
	return (
		<div className='pb-5 px-5 w-full flex-1'>
			<Tabs defaultValue='quick-note' className='h-full flex flex-col w-full'>
				<TabsList className='grid w-full grid-cols-3'>
					<TabsTrigger value='quick-note'>速记</TabsTrigger>
					<TabsTrigger value='link'>链接</TabsTrigger>
					<TabsTrigger value='file'>文件</TabsTrigger>
				</TabsList>
				<TabsContent value='quick-note' className='flex-1'>
					<Card className='h-full flex flex-col'>
						<CardHeader>
							<CardTitle>速记</CardTitle>
							<CardDescription>
								快速记录你的想法，并将其转为知识。
							</CardDescription>
						</CardHeader>
						<CardContent className='flex-1'>
							<AddQuickNote />
						</CardContent>
					</Card>
				</TabsContent>
				<TabsContent value='link' className='flex-1'>
					<Card className='h-full flex flex-col'>
						<CardHeader>
							<CardTitle>链接</CardTitle>
							<CardDescription>
								输入链接，自动转化其对应的页面内容并且转为知识。注意当前仅支持一个链接，不支持多个链接。
							</CardDescription>
						</CardHeader>
						<CardContent className='flex-1'>
							<AddLink />
						</CardContent>
					</Card>
				</TabsContent>
				<TabsContent value='file' className='flex-1'>
					<Card className='h-full flex flex-col'>
						<CardHeader>
							<CardTitle>文件类型</CardTitle>
							<CardDescription>
								<p>传入文件，自动分析文件类型并且编码进知识库。当前仅支持包括图像（.jpg及.png）、PDF、Word（.doc及.docx）、以及PowerPoint（.ppt及.pptx）。</p>
							</CardDescription>
						</CardHeader>
						<CardContent className='flex-1'>
							<AddFile />
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>
		</div>
	);
};

export default CreatePage;
