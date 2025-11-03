
# UpdateNotificationTaskRequest


## Properties

Name | Type
------------ | -------------
`notification_task_id` | number
`notification_content_type` | number
`enable` | boolean
`notification_template_id` | number
`cron_expr` | string
`title` | string
`content` | string
`notification_source_id` | number
`notification_target_id` | number

## Example

```typescript
import type { UpdateNotificationTaskRequest } from ''

// TODO: Update the object below with actual values
const example = {
  "notification_task_id": null,
  "notification_content_type": null,
  "enable": null,
  "notification_template_id": null,
  "cron_expr": null,
  "title": null,
  "content": null,
  "notification_source_id": null,
  "notification_target_id": null,
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


