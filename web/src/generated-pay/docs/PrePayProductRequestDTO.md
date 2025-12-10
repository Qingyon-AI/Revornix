
# PrePayProductRequestDTO


## Properties

Name | Type
------------ | -------------
`product_uuid` | string
`pay_way` | number
`category` | string

## Example

```typescript
import type { PrePayProductRequestDTO } from ''

// TODO: Update the object below with actual values
const example = {
  "product_uuid": null,
  "pay_way": null,
  "category": null,
} satisfies PrePayProductRequestDTO

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as PrePayProductRequestDTO
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


