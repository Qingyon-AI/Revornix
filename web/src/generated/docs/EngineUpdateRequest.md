
# EngineUpdateRequest


## Properties

Name | Type
------------ | -------------
`engine_id` | number
`config_json` | string
`name` | string
`description` | string
`is_public` | boolean
`required_plan_level` | number

## Example

```typescript
import type { EngineUpdateRequest } from ''

// TODO: Update the object below with actual values
const example = {
  "engine_id": null,
  "config_json": null,
  "name": null,
  "description": null,
  "is_public": null,
  "required_plan_level": null,
} satisfies EngineUpdateRequest

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as EngineUpdateRequest
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


