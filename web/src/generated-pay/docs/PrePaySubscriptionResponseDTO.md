
# PrePaySubscriptionResponseDTO


## Properties

Name | Type
------------ | -------------
`subscription_no` | string
`out_trade_no` | string
`code` | string
`product_name` | string
`product_name_zh` | string
`price` | [PriceItem](PriceItem.md)

## Example

```typescript
import type { PrePaySubscriptionResponseDTO } from ''

// TODO: Update the object below with actual values
const example = {
  "subscription_no": null,
  "out_trade_no": null,
  "code": null,
  "product_name": null,
  "product_name_zh": null,
  "price": null,
} satisfies PrePaySubscriptionResponseDTO

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as PrePaySubscriptionResponseDTO
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


