
# TotpRegistrationOptionsResponse


## Properties

Name | Type
------------ | -------------
`challenge_id` | string
`secret` | string
`otpauth_uri` | string

## Example

```typescript
import type { TotpRegistrationOptionsResponse } from ''

// TODO: Update the object below with actual values
const example = {
  "challenge_id": null,
  "secret": null,
  "otpauth_uri": null,
} satisfies TotpRegistrationOptionsResponse

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as TotpRegistrationOptionsResponse
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


