
# DaySectionResponse


## Properties

Name | Type
------------ | -------------
`section_id` | number
`creator` | [UserPublicInfo](UserPublicInfo.md)
`date` | string
`title` | string
`description` | string
`create_time` | Date
`update_time` | Date
`md_file_name` | string
`documents` | [Array&lt;SectionDocumentInfo&gt;](SectionDocumentInfo.md)

## Example

```typescript
import type { DaySectionResponse } from ''

// TODO: Update the object below with actual values
const example = {
  "section_id": null,
  "creator": null,
  "date": null,
  "title": null,
  "description": null,
  "create_time": null,
  "update_time": null,
  "md_file_name": null,
  "documents": null,
} satisfies DaySectionResponse

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as DaySectionResponse
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


