
# DocumentCommentSearchRequest


## Properties

Name | Type
------------ | -------------
`document_id` | number
`start` | number
`limit` | number
`keyword` | string
`sort` | string
`preview_reply_limit` | number

## Example

```typescript
import type { DocumentCommentSearchRequest } from ''

// TODO: Update the object below with actual values
const example = {
  "document_id": null,
  "start": null,
  "limit": null,
  "keyword": null,
  "sort": null,
  "preview_reply_limit": null,
} satisfies DocumentCommentSearchRequest

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as DocumentCommentSearchRequest
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


