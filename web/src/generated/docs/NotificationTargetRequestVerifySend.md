
# NotificationTargetRequestVerifySend


## Properties

Name | Type
------------ | -------------
`notification_target_provided_id` | number
`notification_target_id` | number
`email` | string
`phone` | string
`qr_code` | string

## Example

```typescript
import type { NotificationTargetRequestVerifySend } from ''

// TODO: Update the object below with actual values
const example = {
  "notification_target_provided_id": null,
  "notification_target_id": null,
  "email": null,
  "phone": null,
  "qr_code": null,
} satisfies NotificationTargetRequestVerifySend

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as NotificationTargetRequestVerifySend
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


