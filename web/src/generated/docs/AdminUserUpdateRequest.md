
# AdminUserUpdateRequest


## Properties

Name | Type
------------ | -------------
`user_id` | number
`nickname` | string
`email` | string
`password` | string
`role` | number
`slogan` | string
`avatar` | string
`is_forbidden` | boolean

## Example

```typescript
import type { AdminUserUpdateRequest } from ''

// TODO: Update the object below with actual values
const example = {
  "user_id": null,
  "nickname": null,
  "email": null,
  "password": null,
  "role": null,
  "slogan": null,
  "avatar": null,
  "is_forbidden": null,
} satisfies AdminUserUpdateRequest

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as AdminUserUpdateRequest
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


