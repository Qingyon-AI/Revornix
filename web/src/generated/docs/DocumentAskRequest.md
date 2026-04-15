
# DocumentAskRequest


## Properties

Name | Type
------------ | -------------
`document_id` | number
`messages` | [Array&lt;ChatItem&gt;](ChatItem.md)
`enable_mcp` | boolean
`model_id` | number

## Example

```typescript
import type { DocumentAskRequest } from ''

// TODO: Update the object below with actual values
const example = {
  "document_id": null,
  "messages": null,
  "enable_mcp": null,
  "model_id": null,
} satisfies DocumentAskRequest

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as DocumentAskRequest
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


