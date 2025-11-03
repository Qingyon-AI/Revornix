
# NotificationTask


## Properties

Name | Type
------------ | -------------
`id` | number
`cron_expr` | string
`enable` | boolean
`notification_source_id` | number
`notification_target_id` | number
`notification_content_type` | number
`title` | string
`content` | string
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
  "cron_expr": null,
  "enable": null,
  "notification_source_id": null,
  "notification_target_id": null,
  "notification_content_type": null,
  "title": null,
  "content": null,
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


