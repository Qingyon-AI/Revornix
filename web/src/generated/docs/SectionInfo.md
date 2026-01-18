
# SectionInfo


## Properties

Name | Type
------------ | -------------
`id` | number
`title` | string
`creator` | [UserPublicInfo](UserPublicInfo.md)
`description` | string
`auto_podcast` | boolean
`auto_illustration` | boolean
`documents_count` | number
`subscribers_count` | number
`create_time` | Date
`update_time` | Date
`authority` | number
`is_subscribed` | boolean
`md_file_name` | string
`labels` | [Array&lt;SchemasSectionLabel&gt;](SchemasSectionLabel.md)
`cover` | string
`podcast_task` | [SectionPodcastTask](SectionPodcastTask.md)
`process_task` | [SectionProcessTask](SectionProcessTask.md)
`process_task_trigger_type` | number
`process_task_trigger_scheduler` | string

## Example

```typescript
import type { SectionInfo } from ''

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "title": null,
  "creator": null,
  "description": null,
  "auto_podcast": null,
  "auto_illustration": null,
  "documents_count": null,
  "subscribers_count": null,
  "create_time": null,
  "update_time": null,
  "authority": null,
  "is_subscribed": null,
  "md_file_name": null,
  "labels": null,
  "cover": null,
  "podcast_task": null,
  "process_task": null,
  "process_task_trigger_type": null,
  "process_task_trigger_scheduler": null,
} satisfies SectionInfo

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as SectionInfo
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


