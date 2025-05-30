'use client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { createMCPServer, searchMCPServer } from '@/service/mcp';
import { useTransition } from 'react';
import { utils } from '@kinda/utils';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const MCPPage = () => {
	const { data, isFetching } = useQuery({
		queryKey: ['mcp-server-search'],
		queryFn: async () => {
			return await searchMCPServer({
				keyword: '',
			});
		},
	});
	// const [createPending, startCreate] = useTransition();
	// const handleCreateMCPServer = startCreate(async () => {
	// 	const [res, err] = await utils.to(
	// 		createMCPServer({
	// 			name: '',
	// 			args: '',
	// 			cmd: '',
	// 			address: '',
	// 			category: 0,
	// 		})
	// 	);
	// 	if (err) {
	// 		toast.error(err.message);
	// 		return;
	// 	}
	// 	toast.success('创建成功');
	// });
	return (
		<div className='px-5'>
			<Alert className='mb-4'>
				<Info className='h-4 w-4' />
				<AlertTitle>Heads up!</AlertTitle>
				<AlertDescription>
					在这里你可以配置MCP服务端，配置完成并且启用之后，RevornixAI将具备MCP工具链调用能力。
				</AlertDescription>
			</Alert>
			<div className='flex flex-row w-full justify-end mb-4'>
				<Button className='shadow-none'>增加MCP服务</Button>
			</div>
			<div>
				<Table className='mb-4'>
					<TableHeader>
						<TableRow>
							<TableHead>MCP名称</TableHead>
							<TableHead>MCP类型</TableHead>
							<TableHead>MCP服务器地址</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{data &&
							data.data &&
							data.data.length > 0 &&
							data.data.map((mcp_server, index) => {
								return (
									<TableRow key={index}>
										<TableCell className='font-bold'>
											{mcp_server.name}
										</TableCell>
										<TableCell>
											<Badge>
												{mcp_server.category === 0 ? 'std' : 'stream'}
											</Badge>
										</TableCell>
										<TableCell>{mcp_server.address}</TableCell>
									</TableRow>
								);
							})}
					</TableBody>
				</Table>
				{isFetching && <Skeleton className='w-full h-52' />}
				{data && data.data && data.data.length === 0 && (
					<div className='text-center p-5 text-xs text-muted-foreground rounded bg-muted'>
						暂无MCP服务
					</div>
				)}
			</div>
		</div>
	);
};

export default MCPPage;
