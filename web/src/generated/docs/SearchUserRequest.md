
# SearchUserRequest


## Properties

Name | Type
------------ | -------------
`filter_name` | string
`filter_value` | string
`start` | number
`limit` | number

## Example

```typescript
import type { SearchUserRequest } from ''

// TODO: Update the object below with actual values
const example = {
  "filter_name": null,
  "filter_value": null,
  "start": null,
  "limit": null,
} satisfies SearchUserRequest

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as SearchUserRequest
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


