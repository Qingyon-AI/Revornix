
# AccessRequestHandleRequest


## Properties

Name | Type
------------ | -------------
`access_request_id` | number
`approve` | boolean
`authority` | number
`handle_message` | string

## Example

```typescript
import type { AccessRequestHandleRequest } from ''

// TODO: Update the object below with actual values
const example = {
  "access_request_id": null,
  "approve": null,
  "authority": null,
  "handle_message": null,
} satisfies AccessRequestHandleRequest

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as AccessRequestHandleRequest
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


