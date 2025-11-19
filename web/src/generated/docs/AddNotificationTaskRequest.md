
# AddNotificationTaskRequest


## Properties

Name | Type
------------ | -------------
`notification_content_type` | number
`notification_source_id` | number
`notification_target_id` | number
`trigger_cron_expr` | string
`enable` | boolean
`title` | string
`content` | string
`notification_template_id` | number

## Example

```typescript
import type { AddNotificationTaskRequest } from ''

// TODO: Update the object below with actual values
const example = {
  "notification_content_type": null,
  "notification_source_id": null,
  "notification_target_id": null,
  "trigger_cron_expr": null,
  "enable": null,
  "title": null,
  "content": null,
  "notification_template_id": null,
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


