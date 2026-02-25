
# SectionUserRequest


## Properties

Name | Type
------------ | -------------
`section_id` | number
`start` | number
`limit` | number
`keyword` | string
`filter_roles` | [Array&lt;UserSectionRole&gt;](UserSectionRole.md)

## Example

```typescript
import type { SectionUserRequest } from ''

// TODO: Update the object below with actual values
const example = {
  "section_id": null,
  "start": null,
  "limit": null,
  "keyword": null,
  "filter_roles": null,
} satisfies SectionUserRequest

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as SectionUserRequest
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


