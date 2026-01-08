
# SectionCreateRequest


## Properties

Name | Type
------------ | -------------
`title` | string
`description` | string
`cover` | string
`labels` | Array&lt;number&gt;
`auto_publish` | boolean
`auto_podcast` | boolean
`auto_illustration` | boolean
`process_task_trigger_type` | number
`process_task_trigger_scheduler` | string

## Example

```typescript
import type { SectionCreateRequest } from ''

// TODO: Update the object below with actual values
const example = {
  "title": null,
  "description": null,
  "cover": null,
  "labels": null,
  "auto_publish": null,
  "auto_podcast": null,
  "auto_illustration": null,
  "process_task_trigger_type": null,
  "process_task_trigger_scheduler": null,
} satisfies SectionCreateRequest

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as SectionCreateRequest
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


