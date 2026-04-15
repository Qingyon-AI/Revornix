
# ImageGenerateResponse


## Properties

Name | Type
------------ | -------------
`success` | boolean
`message` | string
`code` | number
`prompt` | string
`image_markdown` | string
`data_url` | string

## Example

```typescript
import type { ImageGenerateResponse } from ''

// TODO: Update the object below with actual values
const example = {
  "success": null,
  "message": null,
  "code": null,
  "prompt": null,
  "image_markdown": null,
  "data_url": null,
} satisfies ImageGenerateResponse

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ImageGenerateResponse
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


