
# SubscriptionStatusResponseDTO


## Properties

Name | Type
------------ | -------------
`subscription_no` | string
`pay_way` | string
`status` | string
`order_status` | number
`auto_renew` | boolean
`expires_at` | number
`provider_subscription_id` | string

## Example

```typescript
import type { SubscriptionStatusResponseDTO } from ''

// TODO: Update the object below with actual values
const example = {
  "subscription_no": null,
  "pay_way": null,
  "status": null,
  "order_status": null,
  "auto_renew": null,
  "expires_at": null,
  "provider_subscription_id": null,
} satisfies SubscriptionStatusResponseDTO

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as SubscriptionStatusResponseDTO
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


