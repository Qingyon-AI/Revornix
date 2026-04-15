
# AdminUserSummary


## Properties

Name | Type
------------ | -------------
`id` | number
`uuid` | string
`role` | number
`avatar` | string
`nickname` | string
`slogan` | string
`email` | string
`phone` | string
`is_forbidden` | boolean
`fans` | number
`follows` | number
`create_time` | Date
`update_time` | Date

## Example

```typescript
import type { AdminUserSummary } from ''

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "uuid": null,
  "role": null,
  "avatar": null,
  "nickname": null,
  "slogan": null,
  "email": null,
  "phone": null,
  "is_forbidden": null,
  "fans": null,
  "follows": null,
  "create_time": null,
  "update_time": null,
} satisfies AdminUserSummary

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as AdminUserSummary
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


