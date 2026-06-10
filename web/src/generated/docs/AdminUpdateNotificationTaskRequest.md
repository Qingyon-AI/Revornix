
# AdminUpdateNotificationTaskRequest


## Properties

Name | Type
------------ | -------------
`notification_task_id` | number
`title` | string
`enable` | boolean
`trigger_event_id` | number
`notification_source_id` | number
`notification_target_id` | number
`user_id` | number

## Example

```typescript
import type { AdminUpdateNotificationTaskRequest } from ''

// TODO: Update the object below with actual values
const example = {
  "notification_task_id": null,
  "title": null,
  "enable": null,
  "trigger_event_id": null,
  "notification_source_id": null,
  "notification_target_id": null,
  "user_id": null,
} satisfies AdminUpdateNotificationTaskRequest

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as AdminUpdateNotificationTaskRequest
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


