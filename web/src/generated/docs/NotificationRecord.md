
# NotificationRecord


## Properties

Name | Type
------------ | -------------
`id` | number
`title` | string
`content` | string
`read_at` | Date
`link` | string
`cover` | string
`create_time` | Date
`update_time` | Date

## Example

```typescript
import type { NotificationRecord } from ''

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "title": null,
  "content": null,
  "read_at": null,
  "link": null,
  "cover": null,
  "create_time": null,
  "update_time": null,
} satisfies NotificationRecord

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as NotificationRecord
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


