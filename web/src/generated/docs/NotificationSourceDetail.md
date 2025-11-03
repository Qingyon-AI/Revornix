
# NotificationSourceDetail


## Properties

Name | Type
------------ | -------------
`id` | number
`title` | string
`description` | string
`category` | number
`email_notification_source` | [EmailNotificationSource](EmailNotificationSource.md)
`ios_notification_source` | [IOSNotificationSource](IOSNotificationSource.md)

## Example

```typescript
import type { NotificationSourceDetail } from ''

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "title": null,
  "description": null,
  "category": null,
  "email_notification_source": null,
  "ios_notification_source": null,
} satisfies NotificationSourceDetail

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as NotificationSourceDetail
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


