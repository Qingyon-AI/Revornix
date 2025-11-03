
# UpdateRssServerRequest


## Properties

Name | Type
------------ | -------------
`rss_id` | number
`title` | string
`description` | string
`cover` | string
`address` | string
`section_ids` | Array&lt;number&gt;

## Example

```typescript
import type { UpdateRssServerRequest } from ''

// TODO: Update the object below with actual values
const example = {
  "rss_id": null,
  "title": null,
  "description": null,
  "cover": null,
  "address": null,
  "section_ids": null,
} satisfies UpdateRssServerRequest

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as UpdateRssServerRequest
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


