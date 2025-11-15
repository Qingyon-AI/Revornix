
# NotificationTargetDetail


## Properties

Name | Type
------------ | -------------
`id` | number
`title` | string
`category` | number
`description` | string
`email_notification_target` | [EmailNotificationTarget](EmailNotificationTarget.md)
`ios_notification_target` | [IOSNotificationTarget](IOSNotificationTarget.md)

## Example

```typescript
import type { NotificationTargetDetail } from ''

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "title": null,
  "category": null,
  "description": null,
  "email_notification_target": null,
  "ios_notification_target": null,
} satisfies NotificationTargetDetail

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as NotificationTargetDetail
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


