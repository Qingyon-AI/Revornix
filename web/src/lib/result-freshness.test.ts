import { describe, expect, it } from 'vitest';

import {
	DocumentEmbeddingStatus,
	DocumentGraphStatus,
	DocumentPodcastStatus,
	DocumentSummarizeStatus,
} from '@/enums/document';

import { getDocumentFreshnessState } from './result-freshness';

// 新鲜度决定用户在卡片上看到的「已过期」提示。它错了不会报错：要么让人以为向量
// 还是最新的（其实文档已经改过），要么把明明最新的结果标成过期、诱导重跑一次
// 昂贵的任务。这里用固定时间点覆盖各条规则。

const T0 = '2026-01-01T00:00:00Z'; // 早
const T1 = '2026-01-02T00:00:00Z'; // 晚

const doc = (overrides: Record<string, unknown>) =>
	({ content_update_time: T0, ...overrides }) as never;

const task = (status: number, time: string) => ({ status, update_time: time });

describe('getDocumentFreshnessState', () => {
	it('没有任何任务时不判过期', () => {
		const state = getDocumentFreshnessState(doc({}));
		expect(state.hasAnyStaleResult).toBe(false);
	});

	it('任务晚于内容更新时是新鲜的', () => {
		const state = getDocumentFreshnessState(
			doc({ embedding_task: task(DocumentEmbeddingStatus.SUCCESS, T1) }),
		);
		expect(state.embeddingStale).toBe(false);
	});

	it('内容晚于任务时判为过期', () => {
		const state = getDocumentFreshnessState(
			doc({
				content_update_time: T1,
				embedding_task: task(DocumentEmbeddingStatus.SUCCESS, T0),
			}),
		);
		expect(state.embeddingStale).toBe(true);
		expect(state.hasAnyStaleResult).toBe(true);
	});

	it('未成功的任务不参与过期判断', () => {
		// 失败/进行中的任务没有"结果"可言，标成过期会让用户以为有个旧结果在
		const state = getDocumentFreshnessState(
			doc({
				content_update_time: T1,
				embedding_task: task(DocumentEmbeddingStatus.FAILED, T0),
			}),
		);
		expect(state.embeddingStale).toBe(false);
	});

	it('各类结果的过期彼此独立', () => {
		const state = getDocumentFreshnessState(
			doc({
				content_update_time: T1,
				embedding_task: task(DocumentEmbeddingStatus.SUCCESS, T0),
				summarize_task: task(DocumentSummarizeStatus.SUCCESS, T1),
			}),
		);
		expect(state.embeddingStale).toBe(true);
		expect(state.summaryStale).toBe(false);
	});

	it('时间相同不算过期', () => {
		// 边界：判断是严格晚于。相等还标过期会让每次处理完都显示"已过期"
		const state = getDocumentFreshnessState(
			doc({
				content_update_time: T0,
				graph_task: task(DocumentGraphStatus.SUCCESS, T0),
			}),
		);
		expect(state.graphStale).toBe(false);
	});

	it('摘要更新后播客判为过期', () => {
		// 播客是拿摘要和图谱当素材的，上游更新了它就该重做 ——
		// 这条不看内容时间，只看上游产物之间的先后
		const state = getDocumentFreshnessState(
			doc({
				podcast_task: task(DocumentPodcastStatus.SUCCESS, T0),
				summarize_task: task(DocumentSummarizeStatus.SUCCESS, T1),
			}),
		);
		expect(state.podcastStale).toBe(true);
	});

	it('图谱更新后播客判为过期', () => {
		const state = getDocumentFreshnessState(
			doc({
				podcast_task: task(DocumentPodcastStatus.SUCCESS, T0),
				graph_task: task(DocumentGraphStatus.SUCCESS, T1),
			}),
		);
		expect(state.podcastStale).toBe(true);
	});

	it('上游任务失败时不让播客判为过期', () => {
		// 失败的摘要没有产生新素材，播客没有理由重做。
		// （这条是补上负向验证暴露的盲区：上面那条 embedding 的状态检查走的是
		//  另一条代码路径，覆盖不到这里的上游状态守卫。）
		const state = getDocumentFreshnessState(
			doc({
				podcast_task: task(DocumentPodcastStatus.SUCCESS, T0),
				summarize_task: task(DocumentSummarizeStatus.FAILED, T1),
				graph_task: task(DocumentGraphStatus.FAILED, T1),
			}),
		);
		expect(state.podcastStale).toBe(false);
	});

	it('上游早于播客时不算过期', () => {
		const state = getDocumentFreshnessState(
			doc({
				podcast_task: task(DocumentPodcastStatus.SUCCESS, T1),
				summarize_task: task(DocumentSummarizeStatus.SUCCESS, T0),
				graph_task: task(DocumentGraphStatus.SUCCESS, T0),
			}),
		);
		expect(state.podcastStale).toBe(false);
	});

	it('没有播客时不会因上游更新而报过期', () => {
		// 从未生成过播客，谈不上"过期"
		const state = getDocumentFreshnessState(
			doc({ summarize_task: task(DocumentSummarizeStatus.SUCCESS, T1) }),
		);
		expect(state.podcastStale).toBe(false);
	});

	it('未传文档时返回全新鲜', () => {
		const state = getDocumentFreshnessState(undefined);
		expect(state.hasAnyStaleResult).toBe(false);
	});

	it('缺少内容时间时不判过期', () => {
		// 拿不到基准就没法比较，此时报过期属于凭空猜测
		const state = getDocumentFreshnessState({
			embedding_task: task(DocumentEmbeddingStatus.SUCCESS, T0),
		} as never);
		expect(state.embeddingStale).toBe(false);
	});
});
