
# UserFileSystemInfo


## Properties

Name | Type
------------ | -------------
`id` | number
`file_system_id` | number
`title` | string
`description` | string
`demo_config` | string
`config_json` | string
`create_time` | Date
`update_time` | Date

## Example

```typescript
import type { UserFileSystemInfo } from ''

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "file_system_id": null,
  "title": null,
  "description": null,
  "demo_config": null,
  "config_json": null,
  "create_time": null,
  "update_time": null,
} satisfies UserFileSystemInfo

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as UserFileSystemInfo
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


