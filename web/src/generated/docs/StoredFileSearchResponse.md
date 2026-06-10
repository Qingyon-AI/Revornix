
# StoredFileSearchResponse


## Properties

Name | Type
------------ | -------------
`total` | number
`start` | number
`limit` | number
`has_more` | boolean
`next_start` | number
`data` | [Array&lt;StoredFileInfo&gt;](StoredFileInfo.md)

## Example

```typescript
import type { StoredFileSearchResponse } from ''

// TODO: Update the object below with actual values
const example = {
  "total": null,
  "start": null,
  "limit": null,
  "has_more": null,
  "next_start": null,
  "data": null,
} satisfies StoredFileSearchResponse

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as StoredFileSearchResponse
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


