
# AgentMessageInfo


## Properties

Name | Type
------------ | -------------
`id` | number
`session_id` | number
`role` | string
`content` | string
`payload` | { [key: string]: any; }
`error` | string
`create_time` | Date

## Example

```typescript
import type { AgentMessageInfo } from ''

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "session_id": null,
  "role": null,
  "content": null,
  "payload": null,
  "error": null,
  "create_time": null,
} satisfies AgentMessageInfo

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as AgentMessageInfo
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


