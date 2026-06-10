
# AccessRequestInfo


## Properties

Name | Type
------------ | -------------
`id` | number
`target_type` | [AccessRequestTargetType](AccessRequestTargetType.md)
`target_id` | number
`applicant` | [UserPublicInfo](UserPublicInfo.md)
`message` | string
`status` | [AccessRequestStatus](AccessRequestStatus.md)
`granted_authority` | number
`handler` | [UserPublicInfo](UserPublicInfo.md)
`handle_message` | string
`create_time` | Date
`update_time` | Date

## Example

```typescript
import type { AccessRequestInfo } from ''

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "target_type": null,
  "target_id": null,
  "applicant": null,
  "message": null,
  "status": null,
  "granted_authority": null,
  "handler": null,
  "handle_message": null,
  "create_time": null,
  "update_time": null,
} satisfies AccessRequestInfo

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as AccessRequestInfo
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


