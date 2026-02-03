
# NotificationSource


## Properties

Name | Type
------------ | -------------
`id` | number
`title` | string
`description` | string
`notification_source_provided` | [NotificationSourceProvided](NotificationSourceProvided.md)
`create_time` | Date
`update_time` | Date
`creator` | [UserPublicInfo](UserPublicInfo.md)
`is_forked` | boolean
`is_public` | boolean

## Example

```typescript
import type { NotificationSource } from ''

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "title": null,
  "description": null,
  "notification_source_provided": null,
  "create_time": null,
  "update_time": null,
  "creator": null,
  "is_forked": null,
  "is_public": null,
} satisfies NotificationSource

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as NotificationSource
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


