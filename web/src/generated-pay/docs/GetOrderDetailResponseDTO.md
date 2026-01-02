
# GetOrderDetailResponseDTO


## Properties

Name | Type
------------ | -------------
`id` | number
`order_no` | string
`price` | [PriceItem](PriceItem.md)
`status` | number
`product` | [ProductResponseDTO](ProductResponseDTO.md)

## Example

```typescript
import type { GetOrderDetailResponseDTO } from ''

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "order_no": null,
  "price": null,
  "status": null,
  "product": null,
} satisfies GetOrderDetailResponseDTO

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as GetOrderDetailResponseDTO
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


