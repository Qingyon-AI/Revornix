
# PrePaySubscriptionRequestDTO


## Properties

Name | Type
------------ | -------------
`product_uuid` | string
`pay_way` | string
`category` | string
`currency_code` | string

## Example

```typescript
import type { PrePaySubscriptionRequestDTO } from ''

// TODO: Update the object below with actual values
const example = {
  "product_uuid": null,
  "pay_way": null,
  "category": null,
  "currency_code": null,
} satisfies PrePaySubscriptionRequestDTO

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as PrePaySubscriptionRequestDTO
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


