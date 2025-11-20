
# UserNotificationTarget


## Properties

Name | Type
------------ | -------------
`id` | number
`title` | string
`notification_target_id` | number
`description` | string
`create_time` | Date
`update_time` | Date
`config_json` | string

## Example

```typescript
import type { UserNotificationTarget } from ''

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "title": null,
  "notification_target_id": null,
  "description": null,
  "create_time": null,
  "update_time": null,
  "config_json": null,
} satisfies UserNotificationTarget

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as UserNotificationTarget
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


