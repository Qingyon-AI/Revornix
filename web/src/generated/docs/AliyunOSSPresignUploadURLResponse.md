
# AliyunOSSPresignUploadURLResponse


## Properties

Name | Type
------------ | -------------
`upload_url` | string
`file_path` | string
`fields` | { [key: string]: any; }
`expiration` | Date

## Example

```typescript
import type { AliyunOSSPresignUploadURLResponse } from ''

// TODO: Update the object below with actual values
const example = {
  "upload_url": null,
  "file_path": null,
  "fields": null,
  "expiration": null,
} satisfies AliyunOSSPresignUploadURLResponse

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as AliyunOSSPresignUploadURLResponse
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


