
# AdminDocumentSummary


## Properties

Name | Type
------------ | -------------
`id` | number
`title` | string
`description` | string
`category` | number
`from_plat` | string
`creator_id` | number
`creator_nickname` | string
`create_time` | Date
`update_time` | Date

## Example

```typescript
import type { AdminDocumentSummary } from ''

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "title": null,
  "description": null,
  "category": null,
  "from_plat": null,
  "creator_id": null,
  "creator_nickname": null,
  "create_time": null,
  "update_time": null,
} satisfies AdminDocumentSummary

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as AdminDocumentSummary
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


