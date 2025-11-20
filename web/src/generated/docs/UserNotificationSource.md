
# UserNotificationSource


## Properties

Name | Type
------------ | -------------
`id` | number
`title` | string
`description` | string
`notification_source_id` | number
`create_time` | Date
`update_time` | Date
`config_json` | string

## Example

```typescript
import type { UserNotificationSource } from ''

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "title": null,
  "description": null,
  "notification_source_id": null,
  "create_time": null,
  "update_time": null,
  "config_json": null,
} satisfies UserNotificationSource

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as UserNotificationSource
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


