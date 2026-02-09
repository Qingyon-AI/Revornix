
# ConfirmSubscriptionResponseDTO


## Properties

Name | Type
------------ | -------------
`subscription_no` | string
`out_trade_no` | string
`subscription_status` | string
`order_status` | number
`active` | boolean
`expires_at` | number

## Example

```typescript
import type { ConfirmSubscriptionResponseDTO } from ''

// TODO: Update the object below with actual values
const example = {
  "subscription_no": null,
  "out_trade_no": null,
  "subscription_status": null,
  "order_status": null,
  "active": null,
  "expires_at": null,
} satisfies ConfirmSubscriptionResponseDTO

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ConfirmSubscriptionResponseDTO
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


