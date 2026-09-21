
# AgentReferenceIn

用户在输入框里 `@` 出来的一个对象。  **正文里只有标题,id 走这里。** 标题会重、会改、会带空格,拿它当标识迟早出事; 把数字 id 塞回正文又会把真正的句子挤没。所以句子照旧是人话(「把 @周报 里的三点 合成一段摘要」),而这份结构化清单负责告诉模型那三个字究竟指向哪一条。

## Properties

Name | Type
------------ | -------------
`kind` | string
`id` | number
`name` | string

## Example

```typescript
import type { AgentReferenceIn } from ''

// TODO: Update the object below with actual values
const example = {
  "kind": null,
  "id": null,
  "name": null,
} satisfies AgentReferenceIn

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as AgentReferenceIn
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


