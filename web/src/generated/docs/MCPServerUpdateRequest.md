
# MCPServerUpdateRequest


## Properties

Name | Type
------------ | -------------
`id` | number
`category` | number
`name` | string
`enable` | boolean
`url` | string
`cmd` | string
`args` | string
`headers` | string
`env` | string

## Example

```typescript
import type { MCPServerUpdateRequest } from ''

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "category": null,
  "name": null,
  "enable": null,
  "url": null,
  "cmd": null,
  "args": null,
  "headers": null,
  "env": null,
} satisfies MCPServerUpdateRequest

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as MCPServerUpdateRequest
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


