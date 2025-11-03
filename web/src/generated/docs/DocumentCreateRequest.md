
# DocumentCreateRequest


## Properties

Name | Type
------------ | -------------
`category` | number
`from_plat` | string
`auto_summary` | boolean
`sections` | Array&lt;number&gt;
`labels` | Array&lt;number&gt;
`title` | string
`description` | string
`cover` | string
`url` | string
`content` | string
`file_name` | string

## Example

```typescript
import type { DocumentCreateRequest } from ''

// TODO: Update the object below with actual values
const example = {
  "category": null,
  "from_plat": null,
  "auto_summary": null,
  "sections": null,
  "labels": null,
  "title": null,
  "description": null,
  "cover": null,
  "url": null,
  "content": null,
  "file_name": null,
} satisfies DocumentCreateRequest

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as DocumentCreateRequest
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


