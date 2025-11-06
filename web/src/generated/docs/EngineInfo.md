
# EngineInfo


## Properties

Name | Type
------------ | -------------
`id` | number
`category` | number
`name` | string
`name_zh` | string
`description` | string
`description_zh` | string
`demo_config` | string

## Example

```typescript
import type { EngineInfo } from ''

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "category": null,
  "name": null,
  "name_zh": null,
  "description": null,
  "description_zh": null,
  "demo_config": null,
} satisfies EngineInfo

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as EngineInfo
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


