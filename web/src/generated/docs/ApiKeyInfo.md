
# ApiKeyInfo


## Properties

Name | Type
------------ | -------------
`id` | number
`api_key` | string
`description` | string
`create_time` | Date
`last_used_time` | Date

## Example

```typescript
import type { ApiKeyInfo } from ''

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "api_key": null,
  "description": null,
  "create_time": null,
  "last_used_time": null,
} satisfies ApiKeyInfo

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ApiKeyInfo
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


