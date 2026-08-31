
# AgentSessionUpdateRequest


## Properties

Name | Type
------------ | -------------
`title` | string
`model_id` | number
`thinking_level` | string
`permission_mode` | string
`auto_allow_tools` | Array&lt;string&gt;
`enable_mcp` | boolean

## Example

```typescript
import type { AgentSessionUpdateRequest } from ''

// TODO: Update the object below with actual values
const example = {
  "title": null,
  "model_id": null,
  "thinking_level": null,
  "permission_mode": null,
  "auto_allow_tools": null,
  "enable_mcp": null,
} satisfies AgentSessionUpdateRequest

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as AgentSessionUpdateRequest
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


