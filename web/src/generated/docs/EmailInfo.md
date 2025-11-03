
# EmailInfo


## Properties

Name | Type
------------ | -------------
`email` | string
`is_initial_password` | boolean
`has_seen_initial_password` | boolean

## Example

```typescript
import type { EmailInfo } from ''

// TODO: Update the object below with actual values
const example = {
  "email": null,
  "is_initial_password": null,
  "has_seen_initial_password": null,
} satisfies EmailInfo

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as EmailInfo
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


