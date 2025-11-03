
# DocumentDetailResponse


## Properties

Name | Type
------------ | -------------
`id` | number
`title` | string
`ai_summary` | string
`description` | string
`cover` | string
`category` | number
`create_time` | Date
`update_time` | Date
`labels` | [Array&lt;SchemasSectionLabel&gt;](SchemasSectionLabel.md)
`creator` | [UserPublicInfo](UserPublicInfo.md)
`sections` | [Array&lt;SchemasDocumentBaseSectionInfo&gt;](SchemasDocumentBaseSectionInfo.md)
`from_plat` | string
`users` | [Array&lt;UserPublicInfo&gt;](UserPublicInfo.md)
`is_star` | boolean
`is_read` | boolean
`website_info` | [WebsiteDocumentInfo](WebsiteDocumentInfo.md)
`file_info` | [FileDocumentInfo](FileDocumentInfo.md)
`quick_note_info` | [QuickNoteDocumentInfo](QuickNoteDocumentInfo.md)
`transform_task` | [DocumentTransformTask](DocumentTransformTask.md)
`embedding_task` | [DocumentEmbeddingTask](DocumentEmbeddingTask.md)
`graph_task` | [DocumentGraphTask](DocumentGraphTask.md)
`process_task` | [DocumentProcessTask](DocumentProcessTask.md)

## Example

```typescript
import type { DocumentDetailResponse } from ''

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "title": null,
  "ai_summary": null,
  "description": null,
  "cover": null,
  "category": null,
  "create_time": null,
  "update_time": null,
  "labels": null,
  "creator": null,
  "sections": null,
  "from_plat": null,
  "users": null,
  "is_star": null,
  "is_read": null,
  "website_info": null,
  "file_info": null,
  "quick_note_info": null,
  "transform_task": null,
  "embedding_task": null,
  "graph_task": null,
  "process_task": null,
} satisfies DocumentDetailResponse

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as DocumentDetailResponse
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


