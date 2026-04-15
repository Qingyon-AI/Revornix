
# DocumentUserModifyRequest


## Properties

Name | Type
------------ | -------------
`document_id` | number
`user_id` | number
`authority` | [UserDocumentAuthority](UserDocumentAuthority.md)

## Example

```typescript
import type { DocumentUserModifyRequest } from ''

// TODO: Update the object below with actual values
const example = {
  "document_id": null,
  "user_id": null,
  "authority": null,
} satisfies DocumentUserModifyRequest

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as DocumentUserModifyRequest
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


