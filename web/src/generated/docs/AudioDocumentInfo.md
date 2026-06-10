
# AudioDocumentInfo


## Properties

Name | Type
------------ | -------------
`audio_file_name` | string
`meeting_mode` | boolean
`speaker_map` | { [key: string]: string; }

## Example

```typescript
import type { AudioDocumentInfo } from ''

// TODO: Update the object below with actual values
const example = {
  "audio_file_name": null,
  "meeting_mode": null,
  "speaker_map": null,
} satisfies AudioDocumentInfo

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as AudioDocumentInfo
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


