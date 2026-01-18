
# ModelProvider


## Properties

Name | Type
------------ | -------------
`id` | number
`uuid` | string
`name` | string
`is_forked` | boolean
`is_public` | boolean
`description` | string
`create_time` | Date
`update_time` | Date
`creator` | [UserPublicInfo](UserPublicInfo.md)

## Example

```typescript
import type { ModelProvider } from ''

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "uuid": null,
  "name": null,
  "is_forked": null,
  "is_public": null,
  "description": null,
  "create_time": null,
  "update_time": null,
  "creator": null,
} satisfies ModelProvider

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ModelProvider
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


