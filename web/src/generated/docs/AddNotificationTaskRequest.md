
# AddNotificationTaskRequest


## Properties

Name | Type
------------ | -------------
`user_notification_source_id` | number
`user_notification_target_id` | number
`enable` | boolean
`title` | string
`notification_content_type` | number
`notification_template_id` | number
`notification_title` | string
`notification_content` | string
`trigger_type` | number
`trigger_event_id` | number
`trigger_scheduler_cron` | string

## Example

```typescript
import type { AddNotificationTaskRequest } from ''

// TODO: Update the object below with actual values
const example = {
  "user_notification_source_id": null,
  "user_notification_target_id": null,
  "enable": null,
  "title": null,
  "notification_content_type": null,
  "notification_template_id": null,
  "notification_title": null,
  "notification_content": null,
  "trigger_type": null,
  "trigger_event_id": null,
  "trigger_scheduler_cron": null,
} satisfies AddNotificationTaskRequest

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as AddNotificationTaskRequest
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


