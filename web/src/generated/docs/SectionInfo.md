
# SectionInfo


## Properties

Name | Type
------------ | -------------
`id` | number
`title` | string
`creator` | [UserPublicInfo](UserPublicInfo.md)
`description` | string
`documents_count` | number
`subscribers_count` | number
`create_time` | Date
`update_time` | Date
`authority` | number
`is_subscribed` | boolean
`md_file_name` | string
`labels` | [Array&lt;SchemasDocumentLabel&gt;](SchemasDocumentLabel.md)
`cover` | string

## Example

```typescript
import type { SectionInfo } from ''

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "title": null,
  "creator": null,
  "description": null,
  "documents_count": null,
  "subscribers_count": null,
  "create_time": null,
  "update_time": null,
  "authority": null,
  "is_subscribed": null,
  "md_file_name": null,
  "labels": null,
  "cover": null,
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


