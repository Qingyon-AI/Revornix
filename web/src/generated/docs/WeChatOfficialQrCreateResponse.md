
# WeChatOfficialQrCreateResponse


## Properties

Name | Type
------------ | -------------
`scene_str` | string
`ticket` | string
`image_url` | string
`expires_in` | number

## Example

```typescript
import type { WeChatOfficialQrCreateResponse } from ''

// TODO: Update the object below with actual values
const example = {
  "scene_str": null,
  "ticket": null,
  "image_url": null,
  "expires_in": null,
} satisfies WeChatOfficialQrCreateResponse

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as WeChatOfficialQrCreateResponse
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


