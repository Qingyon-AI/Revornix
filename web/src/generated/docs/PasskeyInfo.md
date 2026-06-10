
# PasskeyInfo


## Properties

Name | Type
------------ | -------------
`id` | number
`rp_id` | string
`name` | string
`device_type` | string
`backed_up` | boolean
`last_used_at` | Date
`create_time` | Date

## Example

```typescript
import type { PasskeyInfo } from ''

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "rp_id": null,
  "name": null,
  "device_type": null,
  "backed_up": null,
  "last_used_at": null,
  "create_time": null,
} satisfies PasskeyInfo

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as PasskeyInfo
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


