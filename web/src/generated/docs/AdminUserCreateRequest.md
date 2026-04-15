
# AdminUserCreateRequest


## Properties

Name | Type
------------ | -------------
`nickname` | string
`email` | string
`password` | string
`role` | number
`slogan` | string
`avatar` | string

## Example

```typescript
import type { AdminUserCreateRequest } from ''

// TODO: Update the object below with actual values
const example = {
  "nickname": null,
  "email": null,
  "password": null,
  "role": null,
  "slogan": null,
  "avatar": null,
} satisfies AdminUserCreateRequest

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as AdminUserCreateRequest
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


