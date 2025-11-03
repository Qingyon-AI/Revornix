
# UpdateNotificationTargetRequest


## Properties

Name | Type
------------ | -------------
`notification_target_id` | number
`title` | string
`description` | string
`email` | string
`device_token` | string

## Example

```typescript
import type { UpdateNotificationTargetRequest } from ''

// TODO: Update the object below with actual values
const example = {
  "notification_target_id": null,
  "title": null,
  "description": null,
  "email": null,
  "device_token": null,
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


