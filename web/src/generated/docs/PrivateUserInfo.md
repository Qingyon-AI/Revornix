
# PrivateUserInfo


## Properties

Name | Type
------------ | -------------
`id` | number
`uuid` | string
`role` | number
`fans` | number
`follows` | number
`avatar` | string
`nickname` | string
`slogan` | string
`phone_info` | [PhoneInfo](PhoneInfo.md)
`email_info` | [EmailInfo](EmailInfo.md)
`github_info` | [GithubInfo](GithubInfo.md)
`google_info` | [GoogleInfo](GoogleInfo.md)
`wechat_infos` | [Array&lt;WeChatInfo&gt;](WeChatInfo.md)
`default_user_file_system` | number
`default_read_mark_reason` | number
`default_document_reader_model_id` | number
`default_revornix_model_id` | number
`default_website_document_parse_user_engine_id` | number
`default_file_document_parse_user_engine_id` | number
`default_podcast_user_engine_id` | number
`default_image_generate_engine_id` | number

## Example

```typescript
import type { PrivateUserInfo } from ''

// TODO: Update the object below with actual values
const example = {
  "id": null,
  "uuid": null,
  "role": null,
  "fans": null,
  "follows": null,
  "avatar": null,
  "nickname": null,
  "slogan": null,
  "phone_info": null,
  "email_info": null,
  "github_info": null,
  "google_info": null,
  "wechat_infos": null,
  "default_user_file_system": null,
  "default_read_mark_reason": null,
  "default_document_reader_model_id": null,
  "default_revornix_model_id": null,
  "default_website_document_parse_user_engine_id": null,
  "default_file_document_parse_user_engine_id": null,
  "default_podcast_user_engine_id": null,
  "default_image_generate_engine_id": null,
} satisfies PrivateUserInfo

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as PrivateUserInfo
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


