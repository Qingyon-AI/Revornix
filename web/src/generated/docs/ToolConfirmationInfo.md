
# ToolConfirmationInfo


## Properties

Name | Type
------------ | -------------
`id` | number
`session_id` | number
`tool` | string
`permission` | string
`summary` | string
`payload` | { [key: string]: any; }
`status` | string
`result` | any
`error` | string
`requested_by` | string
`decided_by` | number
`create_time` | Date
`resolved_at` | Date

## Example

```typescript
import type { ToolConfirmationInfo } from ''

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "session_id": null,
  "tool": null,
  "permission": null,
  "summary": null,
  "payload": null,
  "status": null,
  "result": null,
  "error": null,
  "requested_by": null,
  "decided_by": null,
  "create_time": null,
  "resolved_at": null,
} satisfies ToolConfirmationInfo

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ToolConfirmationInfo
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


