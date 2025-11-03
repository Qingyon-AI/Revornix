
# ReferenceItem


## Properties

Name | Type
------------ | -------------
`url` | string
`logo_url` | string
`site_name` | string
`title` | string
`summary` | string
`publish_time` | string
`cover_image` | [CoverImage](CoverImage.md)

## Example

```typescript
import type { ReferenceItem } from ''

// TODO: Update the object below with actual values
const example = {
  "url": null,
  "logo_url": null,
  "site_name": null,
  "title": null,
  "summary": null,
  "publish_time": null,
  "cover_image": null,
} satisfies ReferenceItem

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ReferenceItem
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


