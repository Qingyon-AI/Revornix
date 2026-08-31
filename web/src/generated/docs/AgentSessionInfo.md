
# AgentSessionInfo


## Properties

Name | Type
------------ | -------------
`id` | number
`uuid` | string
`title` | string
`status` | string
`adapter` | string
`model_id` | number
`document_id` | number
`section_id` | number
`enable_mcp` | boolean
`thinking_level` | string
`permission_mode` | string
`auto_allow_tools` | Array&lt;string&gt;
`context` | { [key: string]: any; }
`create_time` | Date
`update_time` | Date

## Example

```typescript
import type { AgentSessionInfo } from ''

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "uuid": null,
  "title": null,
  "status": null,
  "adapter": null,
  "model_id": null,
  "document_id": null,
  "section_id": null,
  "enable_mcp": null,
  "thinking_level": null,
  "permission_mode": null,
  "auto_allow_tools": null,
  "context": null,
  "create_time": null,
  "update_time": null,
} satisfies AgentSessionInfo

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as AgentSessionInfo
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


