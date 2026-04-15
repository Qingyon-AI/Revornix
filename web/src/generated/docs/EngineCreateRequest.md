
# EngineCreateRequest


## Properties

Name | Type
------------ | -------------
`name` | string
`description` | string
`is_public` | boolean
`engine_provided_id` | number
`required_plan_level` | number
`is_official_hosted` | boolean
`billing_mode` | [EngineBillingMode](EngineBillingMode.md)
`billing_unit_price` | number
`compute_point_multiplier` | number
`config_json` | string

## Example

```typescript
import type { EngineCreateRequest } from ''

// TODO: Update the object below with actual values
const example = {
  "name": null,
  "description": null,
  "is_public": null,
  "engine_provided_id": null,
  "required_plan_level": null,
  "is_official_hosted": null,
  "billing_mode": null,
  "billing_unit_price": null,
  "compute_point_multiplier": null,
  "config_json": null,
} satisfies EngineCreateRequest

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as EngineCreateRequest
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


