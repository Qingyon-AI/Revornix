
# AddNotificationSourceRequest


## Properties

Name | Type
------------ | -------------
`notification_source_provided_id` | number
`title` | string
`is_public` | boolean
`description` | string
`email_source_form` | [EmailSourceForm](EmailSourceForm.md)
`ios_source_form` | [IOSSourceForm](IOSSourceForm.md)
`feishu_source_form` | [FeiShuSourceForm](FeiShuSourceForm.md)
`telegram_source_form` | [TelegramSourceForm](TelegramSourceForm.md)

## Example

```typescript
import type { AddNotificationSourceRequest } from ''

// TODO: Update the object below with actual values
const example = {
  "notification_source_provided_id": null,
  "title": null,
  "is_public": null,
  "description": null,
  "email_source_form": null,
  "ios_source_form": null,
  "feishu_source_form": null,
  "telegram_source_form": null,
} satisfies AddNotificationSourceRequest

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as AddNotificationSourceRequest
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


