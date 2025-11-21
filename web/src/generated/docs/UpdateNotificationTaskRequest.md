
# UpdateNotificationTaskRequest


## Properties

Name | Type
------------ | -------------
`notification_task_id` | number
`notification_content_type` | number
`enable` | boolean
`notification_template_id` | number
`trigger_type` | number
`trigger_scheduler_cron` | string
`trigger_event_id` | number
`title` | string
`content` | string
`user_notification_source_id` | number
`user_notification_target_id` | number

## Example

```typescript
import type { UpdateNotificationTaskRequest } from ''

// TODO: Update the object below with actual values
const example = {
  "notification_task_id": null,
  "notification_content_type": null,
  "enable": null,
  "notification_template_id": null,
  "trigger_type": null,
  "trigger_scheduler_cron": null,
  "trigger_event_id": null,
  "title": null,
  "content": null,
  "user_notification_source_id": null,
  "user_notification_target_id": null,
} satisfies UpdateNotificationTaskRequest

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as UpdateNotificationTaskRequest
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


