
# DocumentUpdateRequest


## Properties

Name | Type
------------ | -------------
`document_id` | number
`title` | string
`description` | string
`cover` | string
`labels` | Array&lt;number&gt;
`sections` | Array&lt;number&gt;

## Example

```typescript
import type { DocumentUpdateRequest } from ''

// TODO: Update the object below with actual values
const example = {
  "document_id": null,
  "title": null,
  "description": null,
  "cover": null,
  "labels": null,
  "sections": null,
} satisfies DocumentUpdateRequest

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as DocumentUpdateRequest
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


