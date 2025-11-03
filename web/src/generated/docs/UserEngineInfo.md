
# UserEngineInfo


## Properties

Name | Type
------------ | -------------
`id` | number
`engine_id` | number
`title` | string
`description` | string
`demo_config` | string
`enable` | boolean
`config_json` | string
`create_time` | Date
`update_time` | Date

## Example

```typescript
import type { UserEngineInfo } from ''

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "engine_id": null,
  "title": null,
  "description": null,
  "demo_config": null,
  "enable": null,
  "config_json": null,
  "create_time": null,
  "update_time": null,
} satisfies UserEngineInfo

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as UserEngineInfo
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


