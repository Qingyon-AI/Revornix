
# GetRssServerDocumentRequest


## Properties

Name | Type
------------ | -------------
`rss_id` | number
`start` | number
`limit` | number
`keyword` | string
`desc` | boolean

## Example

```typescript
import type { GetRssServerDocumentRequest } from ''

// TODO: Update the object below with actual values
const example = {
  "rss_id": null,
  "start": null,
  "limit": null,
  "keyword": null,
  "desc": null,
} satisfies GetRssServerDocumentRequest

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as GetRssServerDocumentRequest
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


