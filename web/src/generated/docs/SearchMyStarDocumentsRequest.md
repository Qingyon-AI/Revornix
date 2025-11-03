
# SearchMyStarDocumentsRequest


## Properties

Name | Type
------------ | -------------
`keyword` | string
`start` | number
`limit` | number
`label_ids` | Array&lt;number&gt;
`desc` | boolean

## Example

```typescript
import type { SearchMyStarDocumentsRequest } from ''

// TODO: Update the object below with actual values
const example = {
  "keyword": null,
  "start": null,
  "limit": null,
  "label_ids": null,
  "desc": null,
} satisfies SearchMyStarDocumentsRequest

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as SearchMyStarDocumentsRequest
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


