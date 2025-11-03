
# RssServerInfo


## Properties

Name | Type
------------ | -------------
`id` | number
`user_id` | number
`title` | string
`description` | string
`cover` | string
`address` | string
`create_time` | Date
`update_time` | Date
`documents` | [Array&lt;RssDocumentInfo&gt;](RssDocumentInfo.md)
`sections` | [Array&lt;SectionInfo&gt;](SectionInfo.md)

## Example

```typescript
import type { RssServerInfo } from ''

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "user_id": null,
  "title": null,
  "description": null,
  "cover": null,
  "address": null,
  "create_time": null,
  "update_time": null,
  "documents": null,
  "sections": null,
} satisfies RssServerInfo

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as RssServerInfo
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


