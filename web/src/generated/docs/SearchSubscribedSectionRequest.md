
# SearchSubscribedSectionRequest


## Properties

Name | Type
------------ | -------------
`start` | number
`limit` | number
`desc` | boolean
`keyword` | string
`label_ids` | Array&lt;number&gt;

## Example

```typescript
import type { SearchSubscribedSectionRequest } from ''

// TODO: Update the object below with actual values
const example = {
  "start": null,
  "limit": null,
  "desc": null,
  "keyword": null,
  "label_ids": null,
} satisfies SearchSubscribedSectionRequest

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as SearchSubscribedSectionRequest
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


