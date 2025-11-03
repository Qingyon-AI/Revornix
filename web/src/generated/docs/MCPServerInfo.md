
# MCPServerInfo


## Properties

Name | Type
------------ | -------------
`id` | number
`name` | string
`enable` | boolean
`category` | number
`url` | string
`cmd` | string
`args` | string
`env` | string
`headers` | string

## Example

```typescript
import type { MCPServerInfo } from ''

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "name": null,
  "enable": null,
  "category": null,
  "url": null,
  "cmd": null,
  "args": null,
  "env": null,
  "headers": null,
} satisfies MCPServerInfo

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as MCPServerInfo
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


