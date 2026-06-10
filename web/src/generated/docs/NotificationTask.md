
# NotificationTask


## Properties

Name | Type
------------ | -------------
`id` | number
`creator_id` | number
`title` | string
`enable` | boolean
`trigger_event` | [NotificationTriggerEvent](NotificationTriggerEvent.md)
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
  "creator_id": null,
  "title": null,
  "enable": null,
  "trigger_event": null,
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


