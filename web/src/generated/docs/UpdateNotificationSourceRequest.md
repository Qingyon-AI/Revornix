
# UpdateNotificationSourceRequest


## Properties

Name | Type
------------ | -------------
`notification_source_id` | number
`title` | string
`description` | string
`is_public` | boolean
`config_json` | string

## Example

```typescript
import type { UpdateNotificationSourceRequest } from ''

// TODO: Update the object below with actual values
const example = {
  "notification_source_id": null,
  "title": null,
  "description": null,
  "is_public": null,
  "config_json": null,
} satisfies UpdateNotificationSourceRequest

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as UpdateNotificationSourceRequest
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


