
# UserFileSystemUpdateRequest


## Properties

Name | Type
------------ | -------------
`user_file_system_id` | number
`config_json` | string
`title` | string
`description` | string

## Example

```typescript
import type { UserFileSystemUpdateRequest } from ''

// TODO: Update the object below with actual values
const example = {
  "user_file_system_id": null,
  "config_json": null,
  "title": null,
  "description": null,
} satisfies UserFileSystemUpdateRequest

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as UserFileSystemUpdateRequest
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


