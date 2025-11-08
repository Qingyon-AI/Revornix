
# SectionUpdateRequest


## Properties

Name | Type
------------ | -------------
`section_id` | number
`title` | string
`description` | string
`cover` | string
`documents` | Array&lt;number&gt;
`labels` | Array&lt;number&gt;
`auto_podcast` | boolean

## Example

```typescript
import type { SectionUpdateRequest } from ''

// TODO: Update the object below with actual values
const example = {
  "section_id": null,
  "title": null,
  "description": null,
  "cover": null,
  "documents": null,
  "labels": null,
  "auto_podcast": null,
} satisfies SectionUpdateRequest

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as SectionUpdateRequest
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


