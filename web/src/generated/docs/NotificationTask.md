
# NotificationTask


## Properties

Name | Type
------------ | -------------
`id` | number
`enable` | boolean
`notification_content_type` | number
`trigger_type` | number
`trigger_event` | [NotificationTriggerEvent](NotificationTriggerEvent.md)
`trigger_scheduler` | [NotificationTriggerScheduler](NotificationTriggerScheduler.md)
`title` | string
`content` | string
`notification_template_id` | number
`user_notification_source` | [UserNotificationSource](UserNotificationSource.md)
`user_notification_target` | [UserNotificationTarget](UserNotificationTarget.md)
`create_time` | Date
`update_time` | Date

## Example

```typescript
import type { NotificationTask } from ''

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "enable": null,
  "notification_content_type": null,
  "trigger_type": null,
  "trigger_event": null,
  "trigger_scheduler": null,
  "title": null,
  "content": null,
  "notification_template_id": null,
  "user_notification_source": null,
  "user_notification_target": null,
  "create_time": null,
  "update_time": null,
} satisfies NotificationTask

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as NotificationTask
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


