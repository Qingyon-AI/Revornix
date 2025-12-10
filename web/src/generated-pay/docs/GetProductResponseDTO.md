
# GetProductResponseDTO


## Properties

Name | Type
------------ | -------------
`id` | number
`uuid` | string
`name` | string
`name_zh` | string
`description` | string
`description_zh` | string
`price` | number

## Example

```typescript
import type { GetProductResponseDTO } from ''

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "uuid": null,
  "name": null,
  "name_zh": null,
  "description": null,
  "description_zh": null,
  "price": null,
} satisfies GetProductResponseDTO

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as GetProductResponseDTO
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


