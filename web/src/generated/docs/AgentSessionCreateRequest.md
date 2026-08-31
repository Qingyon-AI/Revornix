
# AgentSessionCreateRequest


## Properties

Name | Type
------------ | -------------
`title` | string
`model_id` | number
`document_id` | number
`section_id` | number
`enable_mcp` | boolean

## Example

```typescript
import type { AgentSessionCreateRequest } from ''

// TODO: Update the object below with actual values
const example = {
  "title": null,
  "model_id": null,
  "document_id": null,
  "section_id": null,
  "enable_mcp": null,
} satisfies AgentSessionCreateRequest

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as AgentSessionCreateRequest
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


