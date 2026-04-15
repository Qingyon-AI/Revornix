
# ModelCreateRequest


## Properties

Name | Type
------------ | -------------
`name` | string
`description` | string
`required_plan_level` | number
`provider_id` | number
`is_official_hosted` | boolean
`compute_point_multiplier` | number

## Example

```typescript
import type { ModelCreateRequest } from ''

// TODO: Update the object below with actual values
const example = {
  "name": null,
  "description": null,
  "required_plan_level": null,
  "provider_id": null,
  "is_official_hosted": null,
  "compute_point_multiplier": null,
} satisfies ModelCreateRequest

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ModelCreateRequest
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


