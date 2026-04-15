
# DocumentUserAuthorityResponse


## Properties

Name | Type
------------ | -------------
`document_id` | number
`user_id` | number
`authority` | [UserDocumentAuthority](UserDocumentAuthority.md)
`is_creator` | boolean

## Example

```typescript
import type { DocumentUserAuthorityResponse } from ''

// TODO: Update the object below with actual values
const example = {
  "document_id": null,
  "user_id": null,
  "authority": null,
  "is_creator": null,
} satisfies DocumentUserAuthorityResponse

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as DocumentUserAuthorityResponse
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


