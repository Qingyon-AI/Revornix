
# SectionAskRequest


## Properties

Name | Type
------------ | -------------
`section_id` | number
`messages` | [Array&lt;ChatItem&gt;](ChatItem.md)
`enable_mcp` | boolean

## Example

```typescript
import type { SectionAskRequest } from ''

// TODO: Update the object below with actual values
const example = {
  "section_id": null,
  "messages": null,
  "enable_mcp": null,
} satisfies SectionAskRequest

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as SectionAskRequest
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


