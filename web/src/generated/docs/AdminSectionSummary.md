
# AdminSectionSummary


## Properties

Name | Type
------------ | -------------
`id` | number
`title` | string
`description` | string
`creator_id` | number
`creator_nickname` | string
`documents_count` | number
`subscribers_count` | number
`publish_uuid` | string
`create_time` | Date
`update_time` | Date

## Example

```typescript
import type { AdminSectionSummary } from ''

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "title": null,
  "description": null,
  "creator_id": null,
  "creator_nickname": null,
  "documents_count": null,
  "subscribers_count": null,
  "publish_uuid": null,
  "create_time": null,
  "update_time": null,
} satisfies AdminSectionSummary

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as AdminSectionSummary
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


