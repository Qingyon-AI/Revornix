
# StoredFileInfo


## Properties

Name | Type
------------ | -------------
`id` | number
`owner_user_id` | number
`user_file_system_id` | number
`file_system_id` | number
`path` | string
`content_type` | string
`size_bytes` | number
`source` | string
`create_time` | Date
`update_time` | Date

## Example

```typescript
import type { StoredFileInfo } from ''

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "owner_user_id": null,
  "user_file_system_id": null,
  "file_system_id": null,
  "path": null,
  "content_type": null,
  "size_bytes": null,
  "source": null,
  "create_time": null,
  "update_time": null,
} satisfies StoredFileInfo

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as StoredFileInfo
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


