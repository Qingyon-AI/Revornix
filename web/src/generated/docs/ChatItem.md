
# ChatItem


## Properties

Name | Type
------------ | -------------
`chat_id` | string
`quote` | [Array&lt;Document&gt;](Document.md)
`content` | string
`reasoning_content` | string
`role` | string
`finish_reason` | string
`references` | [Array&lt;ReferenceItem&gt;](ReferenceItem.md)

## Example

```typescript
import type { ChatItem } from ''

// TODO: Update the object below with actual values
const example = {
  "chat_id": null,
  "quote": null,
  "content": null,
  "reasoning_content": null,
  "role": null,
  "finish_reason": null,
  "references": null,
} satisfies ChatItem

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as ChatItem
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


