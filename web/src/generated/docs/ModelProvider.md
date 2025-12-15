
# ModelProvider


## Properties

Name | Type
------------ | -------------
`id` | number
`uuid` | string
`name` | string
`description` | string
`api_key` | string
`api_url` | string

## Example

```typescript
import type { ModelProvider } from ''

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "uuid": null,
  "name": null,
  "description": null,
  "api_key": null,
  "api_url": null,
} satisfies ModelProvider

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ModelProvider
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


