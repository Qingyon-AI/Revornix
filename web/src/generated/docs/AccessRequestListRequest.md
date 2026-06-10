
# AccessRequestListRequest


## Properties

Name | Type
------------ | -------------
`target_type` | [AccessRequestTargetType](AccessRequestTargetType.md)
`target_id` | number
`status` | [AccessRequestStatus](AccessRequestStatus.md)

## Example

```typescript
import type { AccessRequestListRequest } from ''

// TODO: Update the object below with actual values
const example = {
  "target_type": null,
  "target_id": null,
  "status": null,
} satisfies AccessRequestListRequest

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as AccessRequestListRequest
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


