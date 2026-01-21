
# UserPublicInfo


## Properties

Name | Type
------------ | -------------
`id` | number
`role` | number
`nickname` | string
`avatar` | string
`slogan` | string
`is_followed` | boolean
`fans` | number
`follows` | number

## Example

```typescript
import type { UserPublicInfo } from ''

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "role": null,
  "nickname": null,
  "avatar": null,
  "slogan": null,
  "is_followed": null,
  "fans": null,
  "follows": null,
} satisfies UserPublicInfo

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as UserPublicInfo
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


