
# StoredFileMigrateResponse


## Properties

Name | Type
------------ | -------------
`migrated` | number
`skipped` | number
`failed` | number

## Example

```typescript
import type { StoredFileMigrateResponse } from ''

// TODO: Update the object below with actual values
const example = {
  "migrated": null,
  "skipped": null,
  "failed": null,
} satisfies StoredFileMigrateResponse

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as StoredFileMigrateResponse
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


