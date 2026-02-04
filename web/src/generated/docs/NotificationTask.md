
# NotificationTask


## Properties

Name | Type
------------ | -------------
`id` | number
`title` | string
`enable` | boolean
`content_type` | number
`trigger_type` | number
`trigger_event` | [NotificationTriggerEvent](NotificationTriggerEvent.md)
`trigger_scheduler` | [NotificationTriggerScheduler](NotificationTriggerScheduler.md)
`notification_title` | string
`notification_content` | string
`notification_link` | string
`notification_cover` | string
`notification_template_id` | number
`notification_source` | [NotificationSource](NotificationSource.md)
`notification_target` | [NotificationTarget](NotificationTarget.md)
`create_time` | Date
`update_time` | Date

## Example

```typescript
import type { NotificationTask } from ''

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "title": null,
  "enable": null,
  "content_type": null,
  "trigger_type": null,
  "trigger_event": null,
  "trigger_scheduler": null,
  "notification_title": null,
  "notification_content": null,
  "notification_link": null,
  "notification_cover": null,
  "notification_template_id": null,
  "notification_source": null,
  "notification_target": null,
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


