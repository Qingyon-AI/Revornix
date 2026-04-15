
# AdminAntiScrapeEvent


## Properties

Name | Type
------------ | -------------
`timestamp` | Date
`event` | string
`policy` | string
`rule` | string
`method` | string
`host` | string
`path` | string
`service` | string
`clientIp` | string
`userAgentHash` | string
`limit` | number
`remaining` | number
`resetSeconds` | number

## Example

```typescript
import type { AdminAntiScrapeEvent } from ''

// TODO: Update the object below with actual values
const example = {
  "timestamp": null,
  "event": null,
  "policy": null,
  "rule": null,
  "method": null,
  "host": null,
  "path": null,
  "service": null,
  "clientIp": null,
  "userAgentHash": null,
  "limit": null,
  "remaining": null,
  "resetSeconds": null,
} satisfies AdminAntiScrapeEvent

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as AdminAntiScrapeEvent
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


