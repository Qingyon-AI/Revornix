
# DefaultEngineUpdateRequest


## Properties

Name | Type
------------ | -------------
`default_website_document_parse_user_engine_id` | number
`default_file_document_parse_user_engine_id` | number
`default_podcast_user_engine_id` | number
`default_image_generate_engine_id` | number

## Example

```typescript
import type { DefaultEngineUpdateRequest } from ''

// TODO: Update the object below with actual values
const example = {
  "default_website_document_parse_user_engine_id": null,
  "default_file_document_parse_user_engine_id": null,
  "default_podcast_user_engine_id": null,
  "default_image_generate_engine_id": null,
} satisfies DefaultEngineUpdateRequest

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as DefaultEngineUpdateRequest
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


