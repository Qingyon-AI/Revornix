
# BillingAuditIssue


## Properties

Name | Type
------------ | -------------
`code` | string
`severity` | string
`resource_id` | number
`resource_uuid` | string
`resource_name` | string
`provider_name` | string
`title` | string
`description` | string

## Example

```typescript
import type { BillingAuditIssue } from ''

// TODO: Update the object below with actual values
const example = {
  "code": null,
  "severity": null,
  "resource_id": null,
  "resource_uuid": null,
  "resource_name": null,
  "provider_name": null,
  "title": null,
  "description": null,
} satisfies BillingAuditIssue

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as BillingAuditIssue
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


