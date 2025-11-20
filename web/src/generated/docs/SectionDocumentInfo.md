
# SectionDocumentInfo


## Properties

Name | Type
------------ | -------------
`id` | number
`title` | string
`status` | number
`category` | number
`cover` | string
`description` | string
`from_plat` | string
`labels` | [Array&lt;SchemasDocumentLabel&gt;](SchemasDocumentLabel.md)
`sections` | [Array&lt;SchemasSectionBaseSectionInfo&gt;](SchemasSectionBaseSectionInfo.md)
`users` | [Array&lt;UserPublicInfo&gt;](UserPublicInfo.md)
`create_time` | Date
`update_time` | Date

## Example

```typescript
import type { SectionDocumentInfo } from ''

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "title": null,
  "status": null,
  "category": null,
  "cover": null,
  "description": null,
  "from_plat": null,
  "labels": null,
  "sections": null,
  "users": null,
  "create_time": null,
  "update_time": null,
} satisfies SectionDocumentInfo

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as SectionDocumentInfo
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


