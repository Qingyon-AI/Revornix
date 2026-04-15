
# AdminUserComputeLedgerResponse


## Properties

Name | Type
------------ | -------------
`items` | [Array&lt;AdminUserComputeLedgerItem&gt;](AdminUserComputeLedgerItem.md)
`total` | number
`page` | number
`page_size` | number
`has_more` | boolean

## Example

```typescript
import type { AdminUserComputeLedgerResponse } from ''

// TODO: Update the object below with actual values
const example = {
  "items": null,
  "total": null,
  "page": null,
  "page_size": null,
  "has_more": null,
} satisfies AdminUserComputeLedgerResponse

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as AdminUserComputeLedgerResponse
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


