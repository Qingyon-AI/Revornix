
# RssDocumentInfo


## Properties

Name | Type
------------ | -------------
`id` | number
`title` | string
`description` | string
`category` | number
`cover` | string
`from_plat` | string
`create_time` | Date
`update_time` | Date

## Example

```typescript
import type { RssDocumentInfo } from ''

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "title": null,
  "description": null,
  "category": null,
  "cover": null,
  "from_plat": null,
  "create_time": null,
  "update_time": null,
} satisfies RssDocumentInfo

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as RssDocumentInfo
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


