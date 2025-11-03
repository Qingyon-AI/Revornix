
# AddNotificationTargetRequest


## Properties

Name | Type
------------ | -------------
`category` | number
`title` | string
`description` | string
`email` | string
`device_token` | string

## Example

```typescript
import type { AddNotificationTargetRequest } from ''

// TODO: Update the object below with actual values
const example = {
  "category": null,
  "title": null,
  "description": null,
  "email": null,
  "device_token": null,
} satisfies AddNotificationTargetRequest

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as AddNotificationTargetRequest
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


