
# User


## Properties

Name | Type
------------ | -------------
`id` | number
`uuid` | string
`avatar` | string
`nickname` | string
`lastLoginIp` | string
`lastLoginTime` | Date
`role` | number
`slogan` | string
`gender` | number
`age` | number
`isForbidden` | boolean
`defaultDocumentReaderModelId` | number
`defaultRevornixModelId` | number
`defaultFileDocumentParseUserEngineId` | number
`defaultWebsiteDocumentParseUserEngineId` | number
`defaultPodcastUserEngineId` | number
`defaultReadMarkReason` | number
`defaultUserFileSystem` | number
`createTime` | Date
`updateTime` | Date
`deleteAt` | Date

## Example

```typescript
import type { User } from ''

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "uuid": null,
  "avatar": null,
  "nickname": null,
  "lastLoginIp": null,
  "lastLoginTime": null,
  "role": null,
  "slogan": null,
  "gender": null,
  "age": null,
  "isForbidden": null,
  "defaultDocumentReaderModelId": null,
  "defaultRevornixModelId": null,
  "defaultFileDocumentParseUserEngineId": null,
  "defaultWebsiteDocumentParseUserEngineId": null,
  "defaultPodcastUserEngineId": null,
  "defaultReadMarkReason": null,
  "defaultUserFileSystem": null,
  "createTime": null,
  "updateTime": null,
  "deleteAt": null,
} satisfies User

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as User
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


