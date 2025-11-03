
# InifiniteScrollPagnitionNotificationRecord


## Properties

Name | Type
------------ | -------------
`total` | number
`start` | number
`limit` | number
`has_more` | boolean
`elements` | [Array&lt;NotificationRecord&gt;](NotificationRecord.md)
`next_start` | number

## Example

```typescript
import type { InifiniteScrollPagnitionNotificationRecord } from ''

// TODO: Update the object below with actual values
const example = {
  "total": null,
  "start": null,
  "limit": null,
  "has_more": null,
  "elements": null,
  "next_start": null,
} satisfies InifiniteScrollPagnitionNotificationRecord

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as InifiniteScrollPagnitionNotificationRecord
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


