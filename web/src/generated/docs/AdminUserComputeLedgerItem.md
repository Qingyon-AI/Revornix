
# AdminUserComputeLedgerItem


## Properties

Name | Type
------------ | -------------
`id` | number
`delta_points` | number
`balance_after` | number
`reason` | string
`source` | string
`create_time` | Date
`expire_time` | Date

## Example

```typescript
import type { AdminUserComputeLedgerItem } from ''

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "delta_points": null,
  "balance_after": null,
  "reason": null,
  "source": null,
  "create_time": null,
  "expire_time": null,
} satisfies AdminUserComputeLedgerItem

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as AdminUserComputeLedgerItem
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


