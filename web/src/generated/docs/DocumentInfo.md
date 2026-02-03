
# DocumentInfo


## Properties

Name | Type
------------ | -------------
`id` | number
`creator_id` | number
`category` | number
`title` | string
`from_plat` | string
`create_time` | Date
`update_time` | Date
`cover` | string
`description` | string
`labels` | [Array&lt;SchemasDocumentLabel&gt;](SchemasDocumentLabel.md)
`sections` | [Array&lt;SchemasDocumentBaseSectionInfo&gt;](SchemasDocumentBaseSectionInfo.md)
`users` | [Array&lt;UserPublicInfo&gt;](UserPublicInfo.md)
`convert_task` | [DocumentConvertTask](DocumentConvertTask.md)
`embedding_task` | [DocumentEmbeddingTask](DocumentEmbeddingTask.md)
`graph_task` | [DocumentGraphTask](DocumentGraphTask.md)
`podcast_task` | [DocumentPodcastTask](DocumentPodcastTask.md)
`summarize_task` | [DocumentSummarizeTask](DocumentSummarizeTask.md)
`transcribe_task` | [DocumentTranscribeTask](DocumentTranscribeTask.md)
`process_task` | [DocumentProcessTask](DocumentProcessTask.md)

## Example

```typescript
import type { DocumentInfo } from ''

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "creator_id": null,
  "category": null,
  "title": null,
  "from_plat": null,
  "create_time": null,
  "update_time": null,
  "cover": null,
  "description": null,
  "labels": null,
  "sections": null,
  "users": null,
  "convert_task": null,
  "embedding_task": null,
  "graph_task": null,
  "podcast_task": null,
  "summarize_task": null,
  "transcribe_task": null,
  "process_task": null,
} satisfies DocumentInfo

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as DocumentInfo
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


