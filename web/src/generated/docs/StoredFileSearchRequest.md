
# StoredFileSearchRequest


## Properties

Name | Type
------------ | -------------
`keyword` | string
`user_file_system_id` | number
`start` | number
`limit` | number

## Example

```typescript
import type { StoredFileSearchRequest } from ''

// TODO: Update the object below with actual values
const example = {
  "keyword": null,
  "user_file_system_id": null,
  "start": null,
  "limit": null,
} satisfies StoredFileSearchRequest

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as StoredFileSearchRequest
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


