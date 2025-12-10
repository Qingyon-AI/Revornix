
# UserResponseDTO


## Properties

Name | Type
------------ | -------------
`id` | number
`uuid` | string
`nickname` | string
`userPlan` | [UserPlan](UserPlan.md)

## Example

```typescript
import type { UserResponseDTO } from ''

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "uuid": null,
  "nickname": null,
  "userPlan": null,
} satisfies UserResponseDTO

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as UserResponseDTO
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


