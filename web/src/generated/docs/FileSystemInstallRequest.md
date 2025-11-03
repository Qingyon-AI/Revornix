
# FileSystemInstallRequest


## Properties

Name | Type
------------ | -------------
`file_system_id` | number
`title` | string
`description` | string
`config_json` | string

## Example

```typescript
import type { FileSystemInstallRequest } from ''

// TODO: Update the object below with actual values
const example = {
  "file_system_id": null,
  "title": null,
  "description": null,
  "config_json": null,
} satisfies FileSystemInstallRequest

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as FileSystemInstallRequest
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


