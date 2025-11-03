
# MCPServerCreateRequest


## Properties

Name | Type
------------ | -------------
`name` | string
`category` | number
`url` | string
`cmd` | string
`args` | string
`env` | string
`headers` | string

## Example

```typescript
import type { MCPServerCreateRequest } from ''

// TODO: Update the object below with actual values
const example = {
  "name": null,
  "category": null,
  "url": null,
  "cmd": null,
  "args": null,
  "env": null,
  "headers": null,
} satisfies MCPServerCreateRequest

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as MCPServerCreateRequest
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


