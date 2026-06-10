
# DocumentCommentInfo


## Properties

Name | Type
------------ | -------------
`id` | number
`content` | string
`create_time` | Date
`update_time` | Date
`creator` | [UserPublicInfo](UserPublicInfo.md)
`parent_id` | number
`root_id` | number
`reply_user` | [UserPublicInfo](UserPublicInfo.md)
`like_count` | number
`liked` | boolean
`reply_count` | number
`preview_replies` | [Array&lt;DocumentCommentInfo&gt;](DocumentCommentInfo.md)

## Example

```typescript
import type { DocumentCommentInfo } from ''

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "content": null,
  "create_time": null,
  "update_time": null,
  "creator": null,
  "parent_id": null,
  "root_id": null,
  "reply_user": null,
  "like_count": null,
  "liked": null,
  "reply_count": null,
  "preview_replies": null,
} satisfies DocumentCommentInfo

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as DocumentCommentInfo
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


