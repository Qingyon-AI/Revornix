/* tslint:disable */
/* eslint-disable */

export interface SectionKnowledgeSnapshot {
	id: number;
	version: number;
	source_hash: string;
	document_count?: number;
	knowledge_point_count?: number;
	topic_count?: number;
	image_candidate_count?: number;
	create_time: Date;
	update_time?: Date | null;
}

export function SectionKnowledgeSnapshotFromJSON(
	json: any,
): SectionKnowledgeSnapshot {
	return SectionKnowledgeSnapshotFromJSONTyped(json, false);
}

export function SectionKnowledgeSnapshotFromJSONTyped(
	json: any,
	ignoreDiscriminator: boolean,
): SectionKnowledgeSnapshot {
	if (json == null) {
		return json;
	}
	return {
		id: json['id'],
		version: json['version'],
		source_hash: json['source_hash'],
		document_count:
			json['document_count'] == null ? undefined : json['document_count'],
		knowledge_point_count:
			json['knowledge_point_count'] == null
				? undefined
				: json['knowledge_point_count'],
		topic_count: json['topic_count'] == null ? undefined : json['topic_count'],
		image_candidate_count:
			json['image_candidate_count'] == null
				? undefined
				: json['image_candidate_count'],
		create_time: new Date(json['create_time']),
		update_time:
			json['update_time'] == null
				? undefined
				: new Date(json['update_time']),
	};
}

export function SectionKnowledgeSnapshotToJSON(
	value?: SectionKnowledgeSnapshot | null,
): any {
	if (value == null) {
		return value;
	}
	return {
		id: value.id,
		version: value.version,
		source_hash: value.source_hash,
		document_count: value.document_count,
		knowledge_point_count: value.knowledge_point_count,
		topic_count: value.topic_count,
		image_candidate_count: value.image_candidate_count,
		create_time: value.create_time.toISOString(),
		update_time:
			value.update_time == null ? value.update_time : value.update_time.toISOString(),
	};
}
