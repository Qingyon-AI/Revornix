
# SectionPptPreview


## Properties

Name | Type
------------ | -------------
`status` | string
`title` | string
`subtitle` | string
`theme_prompt` | string
`pptx_url` | string
`error_message` | string
`create_time` | Date
`update_time` | Date
`slides` | [Array&lt;SectionPptSlide&gt;](SectionPptSlide.md)

## Example

```typescript
import type { SectionPptPreview } from ''

// TODO: Update the object below with actual values
const example = {
  "status": null,
  "title": null,
  "subtitle": null,
  "theme_prompt": null,
  "pptx_url": null,
  "error_message": null,
  "create_time": null,
  "update_time": null,
  "slides": null,
} satisfies SectionPptPreview

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as SectionPptPreview
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


