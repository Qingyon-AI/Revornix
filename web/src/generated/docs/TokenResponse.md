
# TokenResponse


## Properties

Name | Type
------------ | -------------
`access_token` | string
`refresh_token` | string
`expires_in` | number

## Example

```typescript
import type { TokenResponse } from ''

// TODO: Update the object below with actual values
const example = {
  "access_token": null,
  "refresh_token": null,
  "expires_in": null,
} satisfies TokenResponse

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as TokenResponse
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


