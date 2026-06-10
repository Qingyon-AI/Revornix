
# STTCapabilityInfo

Audio-domain STT engine capability declaration.  Lives under ``EngineCapabilities.stt`` so STT-specific fields never leak onto unrelated engine categories. Surfaced so clients can decide whether an STT engine is eligible for meeting-record mode.

## Properties

Name | Type
------------ | -------------
`segments` | boolean
`diarization` | boolean
`max_audio_seconds` | number

## Example

```typescript
import type { STTCapabilityInfo } from ''

// TODO: Update the object below with actual values
const example = {
  "segments": null,
  "diarization": null,
  "max_audio_seconds": null,
} satisfies STTCapabilityInfo

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as STTCapabilityInfo
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


