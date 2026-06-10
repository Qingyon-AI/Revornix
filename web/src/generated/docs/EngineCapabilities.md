
# EngineCapabilities

Per-category capability envelope for a provided engine.  Each sub-field is scoped to its domain (e.g. ``stt`` for audio transcription). Only the sub-field matching the engine\'s category is populated; everything else stays ``None``. New domains (tts, image, ...) plug in here as additional sub-fields instead of widening ``EngineProvidedInfo``.

## Properties

Name | Type
------------ | -------------
`stt` | [STTCapabilityInfo](STTCapabilityInfo.md)

## Example

```typescript
import type { EngineCapabilities } from ''

// TODO: Update the object below with actual values
const example = {
  "stt": null,
} satisfies EngineCapabilities

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as EngineCapabilities
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


