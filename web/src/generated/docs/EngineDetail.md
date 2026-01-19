
# EngineDetail


## Properties

Name | Type
------------ | -------------
`id` | number
`uuid` | string
`category` | number
`name` | string
`description` | string
`is_public` | boolean
`create_time` | Date
`update_time` | Date
`config_json` | string
`creator` | [UserPublicInfo](UserPublicInfo.md)
`engine_provided` | [EngineProvidedInfo](EngineProvidedInfo.md)

## Example

```typescript
import type { EngineDetail } from ''

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "uuid": null,
  "category": null,
  "name": null,
  "description": null,
  "is_public": null,
  "create_time": null,
  "update_time": null,
  "config_json": null,
  "creator": null,
  "engine_provided": null,
} satisfies EngineDetail

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as EngineDetail
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


