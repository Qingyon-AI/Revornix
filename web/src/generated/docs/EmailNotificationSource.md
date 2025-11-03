
# EmailNotificationSource


## Properties

Name | Type
------------ | -------------
`id` | number
`email` | string
`password` | string
`server` | string
`port` | number

## Example

```typescript
import type { EmailNotificationSource } from ''

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "email": null,
  "password": null,
  "server": null,
  "port": null,
} satisfies EmailNotificationSource

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as EmailNotificationSource
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


