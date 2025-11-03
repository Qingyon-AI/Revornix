
# PaginationApiKeyInfo


## Properties

Name | Type
------------ | -------------
`total_elements` | number
`current_page_elements` | number
`total_pages` | number
`page_num` | number
`page_size` | number
`elements` | [Array&lt;ApiKeyInfo&gt;](ApiKeyInfo.md)

## Example

```typescript
import type { PaginationApiKeyInfo } from ''

// TODO: Update the object below with actual values
const example = {
  "total_elements": null,
  "current_page_elements": null,
  "total_pages": null,
  "page_num": null,
  "page_size": null,
  "elements": null,
} satisfies PaginationApiKeyInfo

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as PaginationApiKeyInfo
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


