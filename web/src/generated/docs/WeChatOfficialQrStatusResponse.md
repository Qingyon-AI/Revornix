
# WeChatOfficialQrStatusResponse


## Properties

Name | Type
------------ | -------------
`status` | string
`access_token` | string
`refresh_token` | string
`expires_in` | number
`mfa_required` | boolean
`challenge_id` | string
`methods` | Array&lt;string&gt;

## Example

```typescript
import type { WeChatOfficialQrStatusResponse } from ''

// TODO: Update the object below with actual values
const example = {
  "status": null,
  "access_token": null,
  "refresh_token": null,
  "expires_in": null,
  "mfa_required": null,
  "challenge_id": null,
  "methods": null,
} satisfies WeChatOfficialQrStatusResponse

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as WeChatOfficialQrStatusResponse
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


