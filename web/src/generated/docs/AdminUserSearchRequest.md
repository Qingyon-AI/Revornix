
# AdminUserSearchRequest


## Properties

Name | Type
------------ | -------------
`keyword` | string
`role` | number
`is_forbidden` | boolean
`page_num` | number
`page_size` | number

## Example

```typescript
import type { AdminUserSearchRequest } from ''

// TODO: Update the object below with actual values
const example = {
  "keyword": null,
  "role": null,
  "is_forbidden": null,
  "page_num": null,
  "page_size": null,
} satisfies AdminUserSearchRequest

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as AdminUserSearchRequest
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


