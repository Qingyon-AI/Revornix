
# UserPlan


## Properties

Name | Type
------------ | -------------
`id` | number
`plan` | [Plan](Plan.md)
`user` | [User](User.md)
`startTime` | Date
`expireTime` | Date
`createTime` | Date
`updateTime` | Date
`deleteAt` | Date

## Example

```typescript
import type { UserPlan } from ''

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "plan": null,
  "user": null,
  "startTime": null,
  "expireTime": null,
  "createTime": null,
  "updateTime": null,
  "deleteAt": null,
} satisfies UserPlan

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as UserPlan
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


