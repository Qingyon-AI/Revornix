
# MigrateFileSystemRequest


## Properties

Name | Type
------------ | -------------
`source_user_file_system_id` | number
`target_user_file_system_id` | number
`stored_file_ids` | Array&lt;number&gt;

## Example

```typescript
import type { MigrateFileSystemRequest } from ''

// TODO: Update the object below with actual values
const example = {
  "source_user_file_system_id": null,
  "target_user_file_system_id": null,
  "stored_file_ids": null,
} satisfies MigrateFileSystemRequest

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as MigrateFileSystemRequest
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


