
# NotificationTargetDetail


## Properties

Name | Type
------------ | -------------
`id` | number
`title` | string
`notification_target_provided` | [NotificationTargetProvided](NotificationTargetProvided.md)
`description` | string
`create_time` | Date
`update_time` | Date
`config_json` | string
`creator` | [UserPublicInfo](UserPublicInfo.md)
`is_public` | boolean

## Example

```typescript
import type { NotificationTargetDetail } from ''

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "title": null,
  "notification_target_provided": null,
  "description": null,
  "create_time": null,
  "update_time": null,
  "config_json": null,
  "creator": null,
  "is_public": null,
} satisfies NotificationTargetDetail

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as NotificationTargetDetail
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


