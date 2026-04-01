
# EngineInfo


## Properties

Name | Type
------------ | -------------
`id` | number
`uuid` | string
`category` | number
`name` | string
`description` | string
`is_public` | boolean
`required_plan_level` | number
`subscription_required` | boolean
`create_time` | Date
`update_time` | Date
`is_forked` | boolean
`creator` | [UserPublicInfo](UserPublicInfo.md)
`engine_provided` | [EngineProvidedInfo](EngineProvidedInfo.md)

## Example

```typescript
import type { EngineInfo } from ''

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "uuid": null,
  "category": null,
  "name": null,
  "description": null,
  "is_public": null,
  "required_plan_level": null,
  "subscription_required": null,
  "create_time": null,
  "update_time": null,
  "is_forked": null,
  "creator": null,
  "engine_provided": null,
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


