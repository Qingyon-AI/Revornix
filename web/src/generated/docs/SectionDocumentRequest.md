
# SectionDocumentRequest


## Properties

Name | Type
------------ | -------------
`section_id` | number
`start` | number
`limit` | number
`desc` | boolean
`keyword` | string

## Example

```typescript
import type { SectionDocumentRequest } from ''

// TODO: Update the object below with actual values
const example = {
  "section_id": null,
  "start": null,
  "limit": null,
  "desc": null,
  "keyword": null,
} satisfies SectionDocumentRequest

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as SectionDocumentRequest
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


