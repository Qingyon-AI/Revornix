
# SectionCommentInfo


## Properties

Name | Type
------------ | -------------
`id` | number
`content` | string
`create_time` | Date
`update_time` | Date
`creator` | [UserPublicInfo](UserPublicInfo.md)

## Example

```typescript
import type { SectionCommentInfo } from ''

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "content": null,
  "create_time": null,
  "update_time": null,
  "creator": null,
} satisfies SectionCommentInfo

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as SectionCommentInfo
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


