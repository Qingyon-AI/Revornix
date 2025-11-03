
# SearchDocumentNoteRequest


## Properties

Name | Type
------------ | -------------
`document_id` | number
`keyword` | string
`start` | number
`limit` | number

## Example

```typescript
import type { SearchDocumentNoteRequest } from ''

// TODO: Update the object below with actual values
const example = {
  "document_id": null,
  "keyword": null,
  "start": null,
  "limit": null,
} satisfies SearchDocumentNoteRequest

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as SearchDocumentNoteRequest
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


