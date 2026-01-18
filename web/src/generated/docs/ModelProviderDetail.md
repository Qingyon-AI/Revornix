
# ModelProviderDetail


## Properties

Name | Type
------------ | -------------
`id` | number
`uuid` | string
`name` | string
`is_public` | boolean
`description` | string
`api_key` | string
`base_url` | string
`create_time` | Date
`update_time` | Date
`creator` | [UserPublicInfo](UserPublicInfo.md)

## Example

```typescript
import type { ModelProviderDetail } from ''

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "uuid": null,
  "name": null,
  "is_public": null,
  "description": null,
  "api_key": null,
  "base_url": null,
  "create_time": null,
  "update_time": null,
  "creator": null,
} satisfies ModelProviderDetail

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ModelProviderDetail
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


