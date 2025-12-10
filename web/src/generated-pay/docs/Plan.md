
# Plan


## Properties

Name | Type
------------ | -------------
`id` | number
`product` | [Product](Product.md)
`expiresIn` | number
`createTime` | Date
`updateTime` | Date
`deleteAt` | Date

## Example

```typescript
import type { Plan } from ''

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "product": null,
  "expiresIn": null,
  "createTime": null,
  "updateTime": null,
  "deleteAt": null,
} satisfies Plan

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as Plan
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


