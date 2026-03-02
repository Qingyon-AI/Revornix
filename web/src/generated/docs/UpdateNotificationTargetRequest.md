
# UpdateNotificationTargetRequest


## Properties

Name | Type
------------ | -------------
`notification_target_id` | number
`title` | string
`description` | string
`is_public` | boolean
`email_target_form` | [EmailTargetForm](EmailTargetForm.md)
`ios_target_form` | [IOSTargetForm](IOSTargetForm.md)
`feishu_target_form` | [FeiShuTargetForm](FeiShuTargetForm.md)
`dingtalk_target_form` | [DingTalkTargetForm](DingTalkTargetForm.md)
`telegram_target_form` | [TelegramTargetForm](TelegramTargetForm.md)

## Example

```typescript
import type { UpdateNotificationTargetRequest } from ''

// TODO: Update the object below with actual values
const example = {
  "notification_target_id": null,
  "title": null,
  "description": null,
  "is_public": null,
  "email_target_form": null,
  "ios_target_form": null,
  "feishu_target_form": null,
  "dingtalk_target_form": null,
  "telegram_target_form": null,
} satisfies UpdateNotificationTargetRequest

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as UpdateNotificationTargetRequest
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


