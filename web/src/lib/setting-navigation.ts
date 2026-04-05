export const settingAnchorIds = {
	defaultRevornixAIModel: 'default_revornix_ai_model_choose',
	defaultDocumentSummaryModel: 'default_document_summary_model_choose',
	defaultWebsiteParseEngine: 'default_website_markdown_parse_user_engine_choose',
	defaultFileParseEngine: 'default_file_markdown_parse_user_engine_choose',
	mcpServerManage: 'mcp_server_manage',
} as const;

export const settingAnchorHrefs = {
	defaultRevornixAIModel: `/setting#${settingAnchorIds.defaultRevornixAIModel}`,
	defaultDocumentSummaryModel: `/setting#${settingAnchorIds.defaultDocumentSummaryModel}`,
	defaultWebsiteParseEngine: `/setting#${settingAnchorIds.defaultWebsiteParseEngine}`,
	defaultFileParseEngine: `/setting#${settingAnchorIds.defaultFileParseEngine}`,
	mcpServerManage: `/setting#${settingAnchorIds.mcpServerManage}`,
} as const;
