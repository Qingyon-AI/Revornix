# DocumentApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**addLabelDocumentLabelCreatePost**](DocumentApi.md#addlabeldocumentlabelcreatepost) | **POST** /document/label/create | Add Label |
| [**askDocumentAiDocumentAskPost**](DocumentApi.md#askdocumentaidocumentaskpost) | **POST** /document/ask | Ask Document Ai |
| [**cancelAiSummaryDocumentAiSummaryCancelPost**](DocumentApi.md#cancelaisummarydocumentaisummarycancelpost) | **POST** /document/ai/summary/cancel | Cancel Ai Summary |
| [**cancelEmbeddingDocumentEmbeddingCancelPost**](DocumentApi.md#cancelembeddingdocumentembeddingcancelpost) | **POST** /document/embedding/cancel | Cancel Embedding |
| [**cancelGraphDocumentGraphCancelPost**](DocumentApi.md#cancelgraphdocumentgraphcancelpost) | **POST** /document/graph/cancel | Cancel Graph |
| [**cancelPodcastDocumentPodcastCancelPost**](DocumentApi.md#cancelpodcastdocumentpodcastcancelpost) | **POST** /document/podcast/cancel | Cancel Podcast |
| [**cancelTranscribeDocumentTranscribeCancelPost**](DocumentApi.md#canceltranscribedocumenttranscribecancelpost) | **POST** /document/transcribe/cancel | Cancel Transcribe |
| [**createAiSummaryDocumentAiSummaryPost**](DocumentApi.md#createaisummarydocumentaisummarypost) | **POST** /document/ai/summary | Create Ai Summary |
| [**createDocumentCommentDocumentCommentCreatePost**](DocumentApi.md#createdocumentcommentdocumentcommentcreatepost) | **POST** /document/comment/create | Create Document Comment |
| [**createDocumentDocumentCreatePost**](DocumentApi.md#createdocumentdocumentcreatepost) | **POST** /document/create | Create Document |
| [**createEmbeddingDocumentEmbeddingPost**](DocumentApi.md#createembeddingdocumentembeddingpost) | **POST** /document/embedding | Create Embedding |
| [**createNoteDocumentNoteCreatePost**](DocumentApi.md#createnotedocumentnotecreatepost) | **POST** /document/note/create | Create Note |
| [**deleteDocumentCommentDocumentCommentDeletePost**](DocumentApi.md#deletedocumentcommentdocumentcommentdeletepost) | **POST** /document/comment/delete | Delete Document Comment |
| [**deleteDocumentDocumentDeletePost**](DocumentApi.md#deletedocumentdocumentdeletepost) | **POST** /document/delete | Delete Document |
| [**deleteDocumentUserDocumentUserDeletePost**](DocumentApi.md#deletedocumentuserdocumentuserdeletepost) | **POST** /document/user/delete | Delete Document User |
| [**deleteLabelDocumentLabelDeletePost**](DocumentApi.md#deletelabeldocumentlabeldeletepost) | **POST** /document/label/delete | Delete Label |
| [**deleteNoteDocumentNoteDeletePost**](DocumentApi.md#deletenotedocumentnotedeletepost) | **POST** /document/note/delete | Delete Note |
| [**documentPublishGetRequestDocumentPublishGetPost**](DocumentApi.md#documentpublishgetrequestdocumentpublishgetpost) | **POST** /document/publish/get | Document Publish Get Request |
| [**documentPublishRequestDocumentPublishPost**](DocumentApi.md#documentpublishrequestdocumentpublishpost) | **POST** /document/publish | Document Publish Request |
| [**documentUserAddRequestDocumentUserAddPost**](DocumentApi.md#documentuseraddrequestdocumentuseraddpost) | **POST** /document/user/add | Document User Add Request |
| [**documentUserModifyRequestDocumentUserModifyPost**](DocumentApi.md#documentusermodifyrequestdocumentusermodifypost) | **POST** /document/user/modify | Document User Modify Request |
| [**documentUserRequestDocumentUserPost**](DocumentApi.md#documentuserrequestdocumentuserpost) | **POST** /document/user | Document User Request |
| [**generateGraphDocumentGraphGeneratePost**](DocumentApi.md#generategraphdocumentgraphgeneratepost) | **POST** /document/graph/generate | Generate Graph |
| [**generatePodcastDocumentPodcastGeneratePost**](DocumentApi.md#generatepodcastdocumentpodcastgeneratepost) | **POST** /document/podcast/generate | Generate Podcast |
| [**getDocumentCommentDetailDocumentCommentDetailPost**](DocumentApi.md#getdocumentcommentdetaildocumentcommentdetailpost) | **POST** /document/comment/detail | Get Document Comment Detail |
| [**getDocumentDetailDocumentDetailPost**](DocumentApi.md#getdocumentdetaildocumentdetailpost) | **POST** /document/detail | Get Document Detail |
| [**getDocumentMarkdownContentDocumentMarkdownContentPost**](DocumentApi.md#getdocumentmarkdowncontentdocumentmarkdowncontentpost) | **POST** /document/markdown/content | Get Document Markdown Content |
| [**getLabelSummaryDocumentLabelSummaryPost**](DocumentApi.md#getlabelsummarydocumentlabelsummarypost) | **POST** /document/label/summary | Get Label Summary |
| [**getMineDocumentAuthorityDocumentMineAuthorityPost**](DocumentApi.md#getminedocumentauthoritydocumentmineauthoritypost) | **POST** /document/mine/authority | Get Mine Document Authority |
| [**getMonthSummaryDocumentMonthSummaryPost**](DocumentApi.md#getmonthsummarydocumentmonthsummarypost) | **POST** /document/month/summary | Get Month Summary |
| [**likeDocumentCommentDocumentCommentLikePost**](DocumentApi.md#likedocumentcommentdocumentcommentlikepost) | **POST** /document/comment/like | Like Document Comment |
| [**listLabelDocumentLabelListPost**](DocumentApi.md#listlabeldocumentlabellistpost) | **POST** /document/label/list | List Label |
| [**listPublicLabelDocumentLabelPublicListPost**](DocumentApi.md#listpubliclabeldocumentlabelpubliclistpost) | **POST** /document/label/public/list | List Public Label |
| [**readDocumentDocumentReadPost**](DocumentApi.md#readdocumentdocumentreadpost) | **POST** /document/read | Read Document |
| [**recentReadDocumentDocumentRecentSearchPost**](DocumentApi.md#recentreaddocumentdocumentrecentsearchpost) | **POST** /document/recent/search | Recent Read Document |
| [**renameAudioSpeakersDocumentAudioSpeakerRenamePost**](DocumentApi.md#renameaudiospeakersdocumentaudiospeakerrenamepost) | **POST** /document/audio/speaker/rename | Rename Audio Speakers |
| [**searchAllMineDocumentsDocumentSearchMinePost**](DocumentApi.md#searchallminedocumentsdocumentsearchminepost) | **POST** /document/search/mine | Search All Mine Documents |
| [**searchDocumentCommentDocumentCommentSearchPost**](DocumentApi.md#searchdocumentcommentdocumentcommentsearchpost) | **POST** /document/comment/search | Search Document Comment |
| [**searchDocumentCommentRepliesDocumentCommentReplySearchPost**](DocumentApi.md#searchdocumentcommentrepliesdocumentcommentreplysearchpost) | **POST** /document/comment/reply/search | Search Document Comment Replies |
| [**searchKnowledgeVectorDocumentVectorSearchPost**](DocumentApi.md#searchknowledgevectordocumentvectorsearchpost) | **POST** /document/vector/search | Search Knowledge Vector |
| [**searchMyStarDocumentsDocumentStarSearchPost**](DocumentApi.md#searchmystardocumentsdocumentstarsearchpost) | **POST** /document/star/search | Search My Star Documents |
| [**searchNoteDocumentNoteSearchPost**](DocumentApi.md#searchnotedocumentnotesearchpost) | **POST** /document/note/search | Search Note |
| [**searchPublicDocumentNotesDocumentNotePublicSearchPost**](DocumentApi.md#searchpublicdocumentnotesdocumentnotepublicsearchpost) | **POST** /document/note/public/search | Search Public Document Notes |
| [**searchPublicDocumentsDocumentPublicSearchPost**](DocumentApi.md#searchpublicdocumentsdocumentpublicsearchpost) | **POST** /document/public/search | Search Public Documents |
| [**searchPublicKnowledgeVectorDocumentPublicVectorSearchPost**](DocumentApi.md#searchpublicknowledgevectordocumentpublicvectorsearchpost) | **POST** /document/public/vector/search | Search Public Knowledge Vector |
| [**searchUserUnreadDocumentsDocumentUnreadSearchPost**](DocumentApi.md#searchuserunreaddocumentsdocumentunreadsearchpost) | **POST** /document/unread/search | Search User Unread Documents |
| [**starDocumentDocumentStarPost**](DocumentApi.md#stardocumentdocumentstarpost) | **POST** /document/star | Star Document |
| [**touchDocumentContentDocumentTouchContentPost**](DocumentApi.md#touchdocumentcontentdocumenttouchcontentpost) | **POST** /document/touch-content | Touch Document Content |
| [**transcribeAudioDocumentDocumentTranscribePost**](DocumentApi.md#transcribeaudiodocumentdocumenttranscribepost) | **POST** /document/transcribe | Transcribe Audio Document |
| [**transformMarkdownDocumentMarkdownTransformPost**](DocumentApi.md#transformmarkdowndocumentmarkdowntransformpost) | **POST** /document/markdown/transform | Transform Markdown |
| [**unlikeDocumentCommentDocumentCommentUnlikePost**](DocumentApi.md#unlikedocumentcommentdocumentcommentunlikepost) | **POST** /document/comment/unlike | Unlike Document Comment |
| [**updateDocumentDocumentUpdatePost**](DocumentApi.md#updatedocumentdocumentupdatepost) | **POST** /document/update | Update Document |



## addLabelDocumentLabelCreatePost

> CreateLabelResponse addLabelDocumentLabelCreatePost(labelAddRequest, authorization, xUserTimezone)

Add Label

### Example

```ts
import {
  Configuration,
  DocumentApi,
} from '';
import type { AddLabelDocumentLabelCreatePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new DocumentApi();

  const body = {
    // LabelAddRequest
    labelAddRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies AddLabelDocumentLabelCreatePostRequest;

  try {
    const data = await api.addLabelDocumentLabelCreatePost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **labelAddRequest** | [LabelAddRequest](LabelAddRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**CreateLabelResponse**](CreateLabelResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## askDocumentAiDocumentAskPost

> any askDocumentAiDocumentAskPost(documentAskRequest, authorization, xUserTimezone)

Ask Document Ai

### Example

```ts
import {
  Configuration,
  DocumentApi,
} from '';
import type { AskDocumentAiDocumentAskPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new DocumentApi();

  const body = {
    // DocumentAskRequest
    documentAskRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies AskDocumentAiDocumentAskPostRequest;

  try {
    const data = await api.askDocumentAiDocumentAskPost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **documentAskRequest** | [DocumentAskRequest](DocumentAskRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

**any**

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## cancelAiSummaryDocumentAiSummaryCancelPost

> NormalResponse cancelAiSummaryDocumentAiSummaryCancelPost(cancelDocumentTaskRequest, authorization, xUserTimezone)

Cancel Ai Summary

### Example

```ts
import {
  Configuration,
  DocumentApi,
} from '';
import type { CancelAiSummaryDocumentAiSummaryCancelPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new DocumentApi();

  const body = {
    // CancelDocumentTaskRequest
    cancelDocumentTaskRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies CancelAiSummaryDocumentAiSummaryCancelPostRequest;

  try {
    const data = await api.cancelAiSummaryDocumentAiSummaryCancelPost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **cancelDocumentTaskRequest** | [CancelDocumentTaskRequest](CancelDocumentTaskRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**NormalResponse**](NormalResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## cancelEmbeddingDocumentEmbeddingCancelPost

> NormalResponse cancelEmbeddingDocumentEmbeddingCancelPost(cancelDocumentTaskRequest, authorization, xUserTimezone)

Cancel Embedding

### Example

```ts
import {
  Configuration,
  DocumentApi,
} from '';
import type { CancelEmbeddingDocumentEmbeddingCancelPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new DocumentApi();

  const body = {
    // CancelDocumentTaskRequest
    cancelDocumentTaskRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies CancelEmbeddingDocumentEmbeddingCancelPostRequest;

  try {
    const data = await api.cancelEmbeddingDocumentEmbeddingCancelPost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **cancelDocumentTaskRequest** | [CancelDocumentTaskRequest](CancelDocumentTaskRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**NormalResponse**](NormalResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## cancelGraphDocumentGraphCancelPost

> NormalResponse cancelGraphDocumentGraphCancelPost(cancelDocumentTaskRequest, authorization, xUserTimezone)

Cancel Graph

### Example

```ts
import {
  Configuration,
  DocumentApi,
} from '';
import type { CancelGraphDocumentGraphCancelPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new DocumentApi();

  const body = {
    // CancelDocumentTaskRequest
    cancelDocumentTaskRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies CancelGraphDocumentGraphCancelPostRequest;

  try {
    const data = await api.cancelGraphDocumentGraphCancelPost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **cancelDocumentTaskRequest** | [CancelDocumentTaskRequest](CancelDocumentTaskRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**NormalResponse**](NormalResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## cancelPodcastDocumentPodcastCancelPost

> NormalResponse cancelPodcastDocumentPodcastCancelPost(cancelDocumentTaskRequest, authorization, xUserTimezone)

Cancel Podcast

### Example

```ts
import {
  Configuration,
  DocumentApi,
} from '';
import type { CancelPodcastDocumentPodcastCancelPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new DocumentApi();

  const body = {
    // CancelDocumentTaskRequest
    cancelDocumentTaskRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies CancelPodcastDocumentPodcastCancelPostRequest;

  try {
    const data = await api.cancelPodcastDocumentPodcastCancelPost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **cancelDocumentTaskRequest** | [CancelDocumentTaskRequest](CancelDocumentTaskRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**NormalResponse**](NormalResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## cancelTranscribeDocumentTranscribeCancelPost

> NormalResponse cancelTranscribeDocumentTranscribeCancelPost(cancelDocumentTaskRequest, authorization, xUserTimezone)

Cancel Transcribe

### Example

```ts
import {
  Configuration,
  DocumentApi,
} from '';
import type { CancelTranscribeDocumentTranscribeCancelPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new DocumentApi();

  const body = {
    // CancelDocumentTaskRequest
    cancelDocumentTaskRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies CancelTranscribeDocumentTranscribeCancelPostRequest;

  try {
    const data = await api.cancelTranscribeDocumentTranscribeCancelPost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **cancelDocumentTaskRequest** | [CancelDocumentTaskRequest](CancelDocumentTaskRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**NormalResponse**](NormalResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## createAiSummaryDocumentAiSummaryPost

> NormalResponse createAiSummaryDocumentAiSummaryPost(documentAiSummaryRequest, authorization, xUserTimezone)

Create Ai Summary

### Example

```ts
import {
  Configuration,
  DocumentApi,
} from '';
import type { CreateAiSummaryDocumentAiSummaryPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new DocumentApi();

  const body = {
    // DocumentAiSummaryRequest
    documentAiSummaryRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies CreateAiSummaryDocumentAiSummaryPostRequest;

  try {
    const data = await api.createAiSummaryDocumentAiSummaryPost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **documentAiSummaryRequest** | [DocumentAiSummaryRequest](DocumentAiSummaryRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**NormalResponse**](NormalResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## createDocumentCommentDocumentCommentCreatePost

> NormalResponse createDocumentCommentDocumentCommentCreatePost(documentCommentCreateRequest, authorization, xUserTimezone)

Create Document Comment

### Example

```ts
import {
  Configuration,
  DocumentApi,
} from '';
import type { CreateDocumentCommentDocumentCommentCreatePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new DocumentApi();

  const body = {
    // DocumentCommentCreateRequest
    documentCommentCreateRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies CreateDocumentCommentDocumentCommentCreatePostRequest;

  try {
    const data = await api.createDocumentCommentDocumentCommentCreatePost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **documentCommentCreateRequest** | [DocumentCommentCreateRequest](DocumentCommentCreateRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**NormalResponse**](NormalResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## createDocumentDocumentCreatePost

> DocumentCreateResponse createDocumentDocumentCreatePost(documentCreateRequest, xUserTimezone, authorization)

Create Document

### Example

```ts
import {
  Configuration,
  DocumentApi,
} from '';
import type { CreateDocumentDocumentCreatePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new DocumentApi();

  const body = {
    // DocumentCreateRequest
    documentCreateRequest: ...,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
    // string (optional)
    authorization: authorization_example,
  } satisfies CreateDocumentDocumentCreatePostRequest;

  try {
    const data = await api.createDocumentDocumentCreatePost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **documentCreateRequest** | [DocumentCreateRequest](DocumentCreateRequest.md) |  | |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**DocumentCreateResponse**](DocumentCreateResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## createEmbeddingDocumentEmbeddingPost

> NormalResponse createEmbeddingDocumentEmbeddingPost(documentEmbeddingRequest, authorization, xUserTimezone)

Create Embedding

### Example

```ts
import {
  Configuration,
  DocumentApi,
} from '';
import type { CreateEmbeddingDocumentEmbeddingPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new DocumentApi();

  const body = {
    // DocumentEmbeddingRequest
    documentEmbeddingRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies CreateEmbeddingDocumentEmbeddingPostRequest;

  try {
    const data = await api.createEmbeddingDocumentEmbeddingPost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **documentEmbeddingRequest** | [DocumentEmbeddingRequest](DocumentEmbeddingRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**NormalResponse**](NormalResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## createNoteDocumentNoteCreatePost

> NormalResponse createNoteDocumentNoteCreatePost(documentNoteCreateRequest, authorization, xUserTimezone)

Create Note

### Example

```ts
import {
  Configuration,
  DocumentApi,
} from '';
import type { CreateNoteDocumentNoteCreatePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new DocumentApi();

  const body = {
    // DocumentNoteCreateRequest
    documentNoteCreateRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies CreateNoteDocumentNoteCreatePostRequest;

  try {
    const data = await api.createNoteDocumentNoteCreatePost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **documentNoteCreateRequest** | [DocumentNoteCreateRequest](DocumentNoteCreateRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**NormalResponse**](NormalResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## deleteDocumentCommentDocumentCommentDeletePost

> NormalResponse deleteDocumentCommentDocumentCommentDeletePost(documentCommentDeleteRequest, authorization, xUserTimezone)

Delete Document Comment

### Example

```ts
import {
  Configuration,
  DocumentApi,
} from '';
import type { DeleteDocumentCommentDocumentCommentDeletePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new DocumentApi();

  const body = {
    // DocumentCommentDeleteRequest
    documentCommentDeleteRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies DeleteDocumentCommentDocumentCommentDeletePostRequest;

  try {
    const data = await api.deleteDocumentCommentDocumentCommentDeletePost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **documentCommentDeleteRequest** | [DocumentCommentDeleteRequest](DocumentCommentDeleteRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**NormalResponse**](NormalResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## deleteDocumentDocumentDeletePost

> SuccessResponse deleteDocumentDocumentDeletePost(documentDeleteRequest, authorization, xUserTimezone)

Delete Document

### Example

```ts
import {
  Configuration,
  DocumentApi,
} from '';
import type { DeleteDocumentDocumentDeletePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new DocumentApi();

  const body = {
    // DocumentDeleteRequest
    documentDeleteRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies DeleteDocumentDocumentDeletePostRequest;

  try {
    const data = await api.deleteDocumentDocumentDeletePost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **documentDeleteRequest** | [DocumentDeleteRequest](DocumentDeleteRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**SuccessResponse**](SuccessResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## deleteDocumentUserDocumentUserDeletePost

> NormalResponse deleteDocumentUserDocumentUserDeletePost(documentUserDeleteRequest, authorization, xUserTimezone)

Delete Document User

### Example

```ts
import {
  Configuration,
  DocumentApi,
} from '';
import type { DeleteDocumentUserDocumentUserDeletePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new DocumentApi();

  const body = {
    // DocumentUserDeleteRequest
    documentUserDeleteRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies DeleteDocumentUserDocumentUserDeletePostRequest;

  try {
    const data = await api.deleteDocumentUserDocumentUserDeletePost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **documentUserDeleteRequest** | [DocumentUserDeleteRequest](DocumentUserDeleteRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**NormalResponse**](NormalResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## deleteLabelDocumentLabelDeletePost

> NormalResponse deleteLabelDocumentLabelDeletePost(labelDeleteRequest, authorization, xUserTimezone)

Delete Label

### Example

```ts
import {
  Configuration,
  DocumentApi,
} from '';
import type { DeleteLabelDocumentLabelDeletePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new DocumentApi();

  const body = {
    // LabelDeleteRequest
    labelDeleteRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies DeleteLabelDocumentLabelDeletePostRequest;

  try {
    const data = await api.deleteLabelDocumentLabelDeletePost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **labelDeleteRequest** | [LabelDeleteRequest](LabelDeleteRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**NormalResponse**](NormalResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## deleteNoteDocumentNoteDeletePost

> NormalResponse deleteNoteDocumentNoteDeletePost(documentNoteDeleteRequest, authorization, xUserTimezone)

Delete Note

### Example

```ts
import {
  Configuration,
  DocumentApi,
} from '';
import type { DeleteNoteDocumentNoteDeletePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new DocumentApi();

  const body = {
    // DocumentNoteDeleteRequest
    documentNoteDeleteRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies DeleteNoteDocumentNoteDeletePostRequest;

  try {
    const data = await api.deleteNoteDocumentNoteDeletePost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **documentNoteDeleteRequest** | [DocumentNoteDeleteRequest](DocumentNoteDeleteRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**NormalResponse**](NormalResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## documentPublishGetRequestDocumentPublishGetPost

> DocumentPublishGetResponse documentPublishGetRequestDocumentPublishGetPost(documentPublishGetRequest, authorization, xUserTimezone)

Document Publish Get Request

### Example

```ts
import {
  Configuration,
  DocumentApi,
} from '';
import type { DocumentPublishGetRequestDocumentPublishGetPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new DocumentApi();

  const body = {
    // DocumentPublishGetRequest
    documentPublishGetRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies DocumentPublishGetRequestDocumentPublishGetPostRequest;

  try {
    const data = await api.documentPublishGetRequestDocumentPublishGetPost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **documentPublishGetRequest** | [DocumentPublishGetRequest](DocumentPublishGetRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**DocumentPublishGetResponse**](DocumentPublishGetResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## documentPublishRequestDocumentPublishPost

> NormalResponse documentPublishRequestDocumentPublishPost(documentPublishRequest, authorization, xUserTimezone)

Document Publish Request

### Example

```ts
import {
  Configuration,
  DocumentApi,
} from '';
import type { DocumentPublishRequestDocumentPublishPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new DocumentApi();

  const body = {
    // DocumentPublishRequest
    documentPublishRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies DocumentPublishRequestDocumentPublishPostRequest;

  try {
    const data = await api.documentPublishRequestDocumentPublishPost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **documentPublishRequest** | [DocumentPublishRequest](DocumentPublishRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**NormalResponse**](NormalResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## documentUserAddRequestDocumentUserAddPost

> NormalResponse documentUserAddRequestDocumentUserAddPost(documentUserAddRequest, authorization, xUserTimezone)

Document User Add Request

### Example

```ts
import {
  Configuration,
  DocumentApi,
} from '';
import type { DocumentUserAddRequestDocumentUserAddPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new DocumentApi();

  const body = {
    // DocumentUserAddRequest
    documentUserAddRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies DocumentUserAddRequestDocumentUserAddPostRequest;

  try {
    const data = await api.documentUserAddRequestDocumentUserAddPost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **documentUserAddRequest** | [DocumentUserAddRequest](DocumentUserAddRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**NormalResponse**](NormalResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## documentUserModifyRequestDocumentUserModifyPost

> NormalResponse documentUserModifyRequestDocumentUserModifyPost(documentUserModifyRequest, authorization, xUserTimezone)

Document User Modify Request

### Example

```ts
import {
  Configuration,
  DocumentApi,
} from '';
import type { DocumentUserModifyRequestDocumentUserModifyPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new DocumentApi();

  const body = {
    // DocumentUserModifyRequest
    documentUserModifyRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies DocumentUserModifyRequestDocumentUserModifyPostRequest;

  try {
    const data = await api.documentUserModifyRequestDocumentUserModifyPost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **documentUserModifyRequest** | [DocumentUserModifyRequest](DocumentUserModifyRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**NormalResponse**](NormalResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## documentUserRequestDocumentUserPost

> InfiniteScrollPaginationDocumentCollaboratorPublicInfo documentUserRequestDocumentUserPost(documentUserRequest, authorization, xUserTimezone)

Document User Request

### Example

```ts
import {
  Configuration,
  DocumentApi,
} from '';
import type { DocumentUserRequestDocumentUserPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new DocumentApi();

  const body = {
    // DocumentUserRequest
    documentUserRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies DocumentUserRequestDocumentUserPostRequest;

  try {
    const data = await api.documentUserRequestDocumentUserPost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **documentUserRequest** | [DocumentUserRequest](DocumentUserRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**InfiniteScrollPaginationDocumentCollaboratorPublicInfo**](InfiniteScrollPaginationDocumentCollaboratorPublicInfo.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## generateGraphDocumentGraphGeneratePost

> NormalResponse generateGraphDocumentGraphGeneratePost(documentGraphGenerateRequest, authorization, xUserTimezone)

Generate Graph

### Example

```ts
import {
  Configuration,
  DocumentApi,
} from '';
import type { GenerateGraphDocumentGraphGeneratePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new DocumentApi();

  const body = {
    // DocumentGraphGenerateRequest
    documentGraphGenerateRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies GenerateGraphDocumentGraphGeneratePostRequest;

  try {
    const data = await api.generateGraphDocumentGraphGeneratePost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **documentGraphGenerateRequest** | [DocumentGraphGenerateRequest](DocumentGraphGenerateRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**NormalResponse**](NormalResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## generatePodcastDocumentPodcastGeneratePost

> NormalResponse generatePodcastDocumentPodcastGeneratePost(generateDocumentPodcastRequest, authorization, xUserTimezone)

Generate Podcast

### Example

```ts
import {
  Configuration,
  DocumentApi,
} from '';
import type { GeneratePodcastDocumentPodcastGeneratePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new DocumentApi();

  const body = {
    // GenerateDocumentPodcastRequest
    generateDocumentPodcastRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies GeneratePodcastDocumentPodcastGeneratePostRequest;

  try {
    const data = await api.generatePodcastDocumentPodcastGeneratePost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **generateDocumentPodcastRequest** | [GenerateDocumentPodcastRequest](GenerateDocumentPodcastRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**NormalResponse**](NormalResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getDocumentCommentDetailDocumentCommentDetailPost

> DocumentCommentInfo getDocumentCommentDetailDocumentCommentDetailPost(documentCommentDetailRequest, authorization, xUserTimezone)

Get Document Comment Detail

### Example

```ts
import {
  Configuration,
  DocumentApi,
} from '';
import type { GetDocumentCommentDetailDocumentCommentDetailPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new DocumentApi();

  const body = {
    // DocumentCommentDetailRequest
    documentCommentDetailRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies GetDocumentCommentDetailDocumentCommentDetailPostRequest;

  try {
    const data = await api.getDocumentCommentDetailDocumentCommentDetailPost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **documentCommentDetailRequest** | [DocumentCommentDetailRequest](DocumentCommentDetailRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**DocumentCommentInfo**](DocumentCommentInfo.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getDocumentDetailDocumentDetailPost

> DocumentDetailResponse getDocumentDetailDocumentDetailPost(documentDetailRequest, authorization, xUserTimezone)

Get Document Detail

### Example

```ts
import {
  Configuration,
  DocumentApi,
} from '';
import type { GetDocumentDetailDocumentDetailPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new DocumentApi();

  const body = {
    // DocumentDetailRequest
    documentDetailRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies GetDocumentDetailDocumentDetailPostRequest;

  try {
    const data = await api.getDocumentDetailDocumentDetailPost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **documentDetailRequest** | [DocumentDetailRequest](DocumentDetailRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**DocumentDetailResponse**](DocumentDetailResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getDocumentMarkdownContentDocumentMarkdownContentPost

> string getDocumentMarkdownContentDocumentMarkdownContentPost(documentMarkdownContentRequest, authorization, xUserTimezone)

Get Document Markdown Content

### Example

```ts
import {
  Configuration,
  DocumentApi,
} from '';
import type { GetDocumentMarkdownContentDocumentMarkdownContentPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new DocumentApi();

  const body = {
    // DocumentMarkdownContentRequest
    documentMarkdownContentRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies GetDocumentMarkdownContentDocumentMarkdownContentPostRequest;

  try {
    const data = await api.getDocumentMarkdownContentDocumentMarkdownContentPost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **documentMarkdownContentRequest** | [DocumentMarkdownContentRequest](DocumentMarkdownContentRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

**string**

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `text/plain`, `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getLabelSummaryDocumentLabelSummaryPost

> LabelSummaryResponse getLabelSummaryDocumentLabelSummaryPost(authorization, xUserTimezone)

Get Label Summary

### Example

```ts
import {
  Configuration,
  DocumentApi,
} from '';
import type { GetLabelSummaryDocumentLabelSummaryPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new DocumentApi();

  const body = {
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies GetLabelSummaryDocumentLabelSummaryPostRequest;

  try {
    const data = await api.getLabelSummaryDocumentLabelSummaryPost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**LabelSummaryResponse**](LabelSummaryResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getMineDocumentAuthorityDocumentMineAuthorityPost

> DocumentUserAuthorityResponse getMineDocumentAuthorityDocumentMineAuthorityPost(mineDocumentAuthorityRequest, authorization, xUserTimezone)

Get Mine Document Authority

### Example

```ts
import {
  Configuration,
  DocumentApi,
} from '';
import type { GetMineDocumentAuthorityDocumentMineAuthorityPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new DocumentApi();

  const body = {
    // MineDocumentAuthorityRequest
    mineDocumentAuthorityRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies GetMineDocumentAuthorityDocumentMineAuthorityPostRequest;

  try {
    const data = await api.getMineDocumentAuthorityDocumentMineAuthorityPost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **mineDocumentAuthorityRequest** | [MineDocumentAuthorityRequest](MineDocumentAuthorityRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**DocumentUserAuthorityResponse**](DocumentUserAuthorityResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getMonthSummaryDocumentMonthSummaryPost

> DocumentMonthSummaryResponse getMonthSummaryDocumentMonthSummaryPost(authorization, xUserTimezone)

Get Month Summary

### Example

```ts
import {
  Configuration,
  DocumentApi,
} from '';
import type { GetMonthSummaryDocumentMonthSummaryPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new DocumentApi();

  const body = {
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies GetMonthSummaryDocumentMonthSummaryPostRequest;

  try {
    const data = await api.getMonthSummaryDocumentMonthSummaryPost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**DocumentMonthSummaryResponse**](DocumentMonthSummaryResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## likeDocumentCommentDocumentCommentLikePost

> NormalResponse likeDocumentCommentDocumentCommentLikePost(documentCommentLikeRequest, authorization, xUserTimezone)

Like Document Comment

### Example

```ts
import {
  Configuration,
  DocumentApi,
} from '';
import type { LikeDocumentCommentDocumentCommentLikePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new DocumentApi();

  const body = {
    // DocumentCommentLikeRequest
    documentCommentLikeRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies LikeDocumentCommentDocumentCommentLikePostRequest;

  try {
    const data = await api.likeDocumentCommentDocumentCommentLikePost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **documentCommentLikeRequest** | [DocumentCommentLikeRequest](DocumentCommentLikeRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**NormalResponse**](NormalResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## listLabelDocumentLabelListPost

> SchemasDocumentLabelListResponse listLabelDocumentLabelListPost(authorization, xUserTimezone)

List Label

### Example

```ts
import {
  Configuration,
  DocumentApi,
} from '';
import type { ListLabelDocumentLabelListPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new DocumentApi();

  const body = {
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies ListLabelDocumentLabelListPostRequest;

  try {
    const data = await api.listLabelDocumentLabelListPost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**SchemasDocumentLabelListResponse**](SchemasDocumentLabelListResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## listPublicLabelDocumentLabelPublicListPost

> SchemasDocumentLabelListResponse listPublicLabelDocumentLabelPublicListPost()

List Public Label

### Example

```ts
import {
  Configuration,
  DocumentApi,
} from '';
import type { ListPublicLabelDocumentLabelPublicListPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new DocumentApi();

  try {
    const data = await api.listPublicLabelDocumentLabelPublicListPost();
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters

This endpoint does not need any parameter.

### Return type

[**SchemasDocumentLabelListResponse**](SchemasDocumentLabelListResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## readDocumentDocumentReadPost

> SuccessResponse readDocumentDocumentReadPost(readRequest, authorization, xUserTimezone)

Read Document

### Example

```ts
import {
  Configuration,
  DocumentApi,
} from '';
import type { ReadDocumentDocumentReadPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new DocumentApi();

  const body = {
    // ReadRequest
    readRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies ReadDocumentDocumentReadPostRequest;

  try {
    const data = await api.readDocumentDocumentReadPost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **readRequest** | [ReadRequest](ReadRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**SuccessResponse**](SuccessResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## recentReadDocumentDocumentRecentSearchPost

> InfiniteScrollPaginationDocumentInfo recentReadDocumentDocumentRecentSearchPost(searchRecentReadRequest, authorization, xUserTimezone)

Recent Read Document

### Example

```ts
import {
  Configuration,
  DocumentApi,
} from '';
import type { RecentReadDocumentDocumentRecentSearchPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new DocumentApi();

  const body = {
    // SearchRecentReadRequest
    searchRecentReadRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies RecentReadDocumentDocumentRecentSearchPostRequest;

  try {
    const data = await api.recentReadDocumentDocumentRecentSearchPost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **searchRecentReadRequest** | [SearchRecentReadRequest](SearchRecentReadRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**InfiniteScrollPaginationDocumentInfo**](InfiniteScrollPaginationDocumentInfo.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## renameAudioSpeakersDocumentAudioSpeakerRenamePost

> NormalResponse renameAudioSpeakersDocumentAudioSpeakerRenamePost(documentAudioSpeakerRenameRequest, authorization, xUserTimezone)

Rename Audio Speakers

Rename diarized speakers for a meeting-record audio document.  P0 scope: this only persists the raw-label -&gt; display-name map on the audio document. The stored transcript markdown / segments JSON are not re-rendered; clients apply the map when presenting the transcript.

### Example

```ts
import {
  Configuration,
  DocumentApi,
} from '';
import type { RenameAudioSpeakersDocumentAudioSpeakerRenamePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new DocumentApi();

  const body = {
    // DocumentAudioSpeakerRenameRequest
    documentAudioSpeakerRenameRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies RenameAudioSpeakersDocumentAudioSpeakerRenamePostRequest;

  try {
    const data = await api.renameAudioSpeakersDocumentAudioSpeakerRenamePost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **documentAudioSpeakerRenameRequest** | [DocumentAudioSpeakerRenameRequest](DocumentAudioSpeakerRenameRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**NormalResponse**](NormalResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## searchAllMineDocumentsDocumentSearchMinePost

> InfiniteScrollPaginationDocumentInfo searchAllMineDocumentsDocumentSearchMinePost(searchAllMyDocumentsRequest, authorization, xUserTimezone)

Search All Mine Documents

### Example

```ts
import {
  Configuration,
  DocumentApi,
} from '';
import type { SearchAllMineDocumentsDocumentSearchMinePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new DocumentApi();

  const body = {
    // SearchAllMyDocumentsRequest
    searchAllMyDocumentsRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies SearchAllMineDocumentsDocumentSearchMinePostRequest;

  try {
    const data = await api.searchAllMineDocumentsDocumentSearchMinePost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **searchAllMyDocumentsRequest** | [SearchAllMyDocumentsRequest](SearchAllMyDocumentsRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**InfiniteScrollPaginationDocumentInfo**](InfiniteScrollPaginationDocumentInfo.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## searchDocumentCommentDocumentCommentSearchPost

> InfiniteScrollPaginationDocumentCommentInfo searchDocumentCommentDocumentCommentSearchPost(documentCommentSearchRequest, authorization, xUserTimezone)

Search Document Comment

### Example

```ts
import {
  Configuration,
  DocumentApi,
} from '';
import type { SearchDocumentCommentDocumentCommentSearchPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new DocumentApi();

  const body = {
    // DocumentCommentSearchRequest
    documentCommentSearchRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies SearchDocumentCommentDocumentCommentSearchPostRequest;

  try {
    const data = await api.searchDocumentCommentDocumentCommentSearchPost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **documentCommentSearchRequest** | [DocumentCommentSearchRequest](DocumentCommentSearchRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**InfiniteScrollPaginationDocumentCommentInfo**](InfiniteScrollPaginationDocumentCommentInfo.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## searchDocumentCommentRepliesDocumentCommentReplySearchPost

> InfiniteScrollPaginationDocumentCommentInfo searchDocumentCommentRepliesDocumentCommentReplySearchPost(documentCommentReplySearchRequest, authorization, xUserTimezone)

Search Document Comment Replies

### Example

```ts
import {
  Configuration,
  DocumentApi,
} from '';
import type { SearchDocumentCommentRepliesDocumentCommentReplySearchPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new DocumentApi();

  const body = {
    // DocumentCommentReplySearchRequest
    documentCommentReplySearchRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies SearchDocumentCommentRepliesDocumentCommentReplySearchPostRequest;

  try {
    const data = await api.searchDocumentCommentRepliesDocumentCommentReplySearchPost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **documentCommentReplySearchRequest** | [DocumentCommentReplySearchRequest](DocumentCommentReplySearchRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**InfiniteScrollPaginationDocumentCommentInfo**](InfiniteScrollPaginationDocumentCommentInfo.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## searchKnowledgeVectorDocumentVectorSearchPost

> VectorSearchResponse searchKnowledgeVectorDocumentVectorSearchPost(vectorSearchRequest, authorization, xUserTimezone)

Search Knowledge Vector

### Example

```ts
import {
  Configuration,
  DocumentApi,
} from '';
import type { SearchKnowledgeVectorDocumentVectorSearchPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new DocumentApi();

  const body = {
    // VectorSearchRequest
    vectorSearchRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies SearchKnowledgeVectorDocumentVectorSearchPostRequest;

  try {
    const data = await api.searchKnowledgeVectorDocumentVectorSearchPost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **vectorSearchRequest** | [VectorSearchRequest](VectorSearchRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**VectorSearchResponse**](VectorSearchResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## searchMyStarDocumentsDocumentStarSearchPost

> InfiniteScrollPaginationDocumentInfo searchMyStarDocumentsDocumentStarSearchPost(searchMyStarDocumentsRequest, authorization, xUserTimezone)

Search My Star Documents

### Example

```ts
import {
  Configuration,
  DocumentApi,
} from '';
import type { SearchMyStarDocumentsDocumentStarSearchPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new DocumentApi();

  const body = {
    // SearchMyStarDocumentsRequest
    searchMyStarDocumentsRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies SearchMyStarDocumentsDocumentStarSearchPostRequest;

  try {
    const data = await api.searchMyStarDocumentsDocumentStarSearchPost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **searchMyStarDocumentsRequest** | [SearchMyStarDocumentsRequest](SearchMyStarDocumentsRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**InfiniteScrollPaginationDocumentInfo**](InfiniteScrollPaginationDocumentInfo.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## searchNoteDocumentNoteSearchPost

> InfiniteScrollPaginationDocumentNoteInfo searchNoteDocumentNoteSearchPost(searchDocumentNoteRequest, authorization, xUserTimezone)

Search Note

### Example

```ts
import {
  Configuration,
  DocumentApi,
} from '';
import type { SearchNoteDocumentNoteSearchPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new DocumentApi();

  const body = {
    // SearchDocumentNoteRequest
    searchDocumentNoteRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies SearchNoteDocumentNoteSearchPostRequest;

  try {
    const data = await api.searchNoteDocumentNoteSearchPost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **searchDocumentNoteRequest** | [SearchDocumentNoteRequest](SearchDocumentNoteRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**InfiniteScrollPaginationDocumentNoteInfo**](InfiniteScrollPaginationDocumentNoteInfo.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## searchPublicDocumentNotesDocumentNotePublicSearchPost

> InfiniteScrollPaginationDocumentNoteInfo searchPublicDocumentNotesDocumentNotePublicSearchPost(searchDocumentNoteRequest, authorization, xUserTimezone)

Search Public Document Notes

Public-readable note search.  Notes are listed read-only; gated by published-or-collaborator access. Mirrors the public access pattern used by document comments.

### Example

```ts
import {
  Configuration,
  DocumentApi,
} from '';
import type { SearchPublicDocumentNotesDocumentNotePublicSearchPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new DocumentApi();

  const body = {
    // SearchDocumentNoteRequest
    searchDocumentNoteRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies SearchPublicDocumentNotesDocumentNotePublicSearchPostRequest;

  try {
    const data = await api.searchPublicDocumentNotesDocumentNotePublicSearchPost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **searchDocumentNoteRequest** | [SearchDocumentNoteRequest](SearchDocumentNoteRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**InfiniteScrollPaginationDocumentNoteInfo**](InfiniteScrollPaginationDocumentNoteInfo.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## searchPublicDocumentsDocumentPublicSearchPost

> InfiniteScrollPaginationDocumentInfo searchPublicDocumentsDocumentPublicSearchPost(searchPublicDocumentsRequest, authorization, xUserTimezone)

Search Public Documents

### Example

```ts
import {
  Configuration,
  DocumentApi,
} from '';
import type { SearchPublicDocumentsDocumentPublicSearchPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new DocumentApi();

  const body = {
    // SearchPublicDocumentsRequest
    searchPublicDocumentsRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies SearchPublicDocumentsDocumentPublicSearchPostRequest;

  try {
    const data = await api.searchPublicDocumentsDocumentPublicSearchPost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **searchPublicDocumentsRequest** | [SearchPublicDocumentsRequest](SearchPublicDocumentsRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**InfiniteScrollPaginationDocumentInfo**](InfiniteScrollPaginationDocumentInfo.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## searchPublicKnowledgeVectorDocumentPublicVectorSearchPost

> VectorSearchResponse searchPublicKnowledgeVectorDocumentPublicVectorSearchPost(vectorSearchRequest)

Search Public Knowledge Vector

### Example

```ts
import {
  Configuration,
  DocumentApi,
} from '';
import type { SearchPublicKnowledgeVectorDocumentPublicVectorSearchPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new DocumentApi();

  const body = {
    // VectorSearchRequest
    vectorSearchRequest: ...,
  } satisfies SearchPublicKnowledgeVectorDocumentPublicVectorSearchPostRequest;

  try {
    const data = await api.searchPublicKnowledgeVectorDocumentPublicVectorSearchPost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **vectorSearchRequest** | [VectorSearchRequest](VectorSearchRequest.md) |  | |

### Return type

[**VectorSearchResponse**](VectorSearchResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## searchUserUnreadDocumentsDocumentUnreadSearchPost

> InfiniteScrollPaginationDocumentInfo searchUserUnreadDocumentsDocumentUnreadSearchPost(searchUnreadListRequest, authorization, xUserTimezone)

Search User Unread Documents

### Example

```ts
import {
  Configuration,
  DocumentApi,
} from '';
import type { SearchUserUnreadDocumentsDocumentUnreadSearchPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new DocumentApi();

  const body = {
    // SearchUnreadListRequest
    searchUnreadListRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies SearchUserUnreadDocumentsDocumentUnreadSearchPostRequest;

  try {
    const data = await api.searchUserUnreadDocumentsDocumentUnreadSearchPost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **searchUnreadListRequest** | [SearchUnreadListRequest](SearchUnreadListRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**InfiniteScrollPaginationDocumentInfo**](InfiniteScrollPaginationDocumentInfo.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## starDocumentDocumentStarPost

> SuccessResponse starDocumentDocumentStarPost(starRequest, authorization, xUserTimezone)

Star Document

### Example

```ts
import {
  Configuration,
  DocumentApi,
} from '';
import type { StarDocumentDocumentStarPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new DocumentApi();

  const body = {
    // StarRequest
    starRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies StarDocumentDocumentStarPostRequest;

  try {
    const data = await api.starDocumentDocumentStarPost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **starRequest** | [StarRequest](StarRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**SuccessResponse**](SuccessResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## touchDocumentContentDocumentTouchContentPost

> NormalResponse touchDocumentContentDocumentTouchContentPost(documentDetailRequest, authorization, xUserTimezone)

Touch Document Content

### Example

```ts
import {
  Configuration,
  DocumentApi,
} from '';
import type { TouchDocumentContentDocumentTouchContentPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new DocumentApi();

  const body = {
    // DocumentDetailRequest
    documentDetailRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies TouchDocumentContentDocumentTouchContentPostRequest;

  try {
    const data = await api.touchDocumentContentDocumentTouchContentPost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **documentDetailRequest** | [DocumentDetailRequest](DocumentDetailRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**NormalResponse**](NormalResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## transcribeAudioDocumentDocumentTranscribePost

> NormalResponse transcribeAudioDocumentDocumentTranscribePost(documentTranscribeRequest, authorization, xUserTimezone)

Transcribe Audio Document

### Example

```ts
import {
  Configuration,
  DocumentApi,
} from '';
import type { TranscribeAudioDocumentDocumentTranscribePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new DocumentApi();

  const body = {
    // DocumentTranscribeRequest
    documentTranscribeRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies TranscribeAudioDocumentDocumentTranscribePostRequest;

  try {
    const data = await api.transcribeAudioDocumentDocumentTranscribePost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **documentTranscribeRequest** | [DocumentTranscribeRequest](DocumentTranscribeRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**NormalResponse**](NormalResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## transformMarkdownDocumentMarkdownTransformPost

> NormalResponse transformMarkdownDocumentMarkdownTransformPost(documentMarkdownConvertRequest, authorization, xUserTimezone)

Transform Markdown

### Example

```ts
import {
  Configuration,
  DocumentApi,
} from '';
import type { TransformMarkdownDocumentMarkdownTransformPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new DocumentApi();

  const body = {
    // DocumentMarkdownConvertRequest
    documentMarkdownConvertRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies TransformMarkdownDocumentMarkdownTransformPostRequest;

  try {
    const data = await api.transformMarkdownDocumentMarkdownTransformPost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **documentMarkdownConvertRequest** | [DocumentMarkdownConvertRequest](DocumentMarkdownConvertRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**NormalResponse**](NormalResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## unlikeDocumentCommentDocumentCommentUnlikePost

> NormalResponse unlikeDocumentCommentDocumentCommentUnlikePost(documentCommentLikeRequest, authorization, xUserTimezone)

Unlike Document Comment

### Example

```ts
import {
  Configuration,
  DocumentApi,
} from '';
import type { UnlikeDocumentCommentDocumentCommentUnlikePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new DocumentApi();

  const body = {
    // DocumentCommentLikeRequest
    documentCommentLikeRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies UnlikeDocumentCommentDocumentCommentUnlikePostRequest;

  try {
    const data = await api.unlikeDocumentCommentDocumentCommentUnlikePost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **documentCommentLikeRequest** | [DocumentCommentLikeRequest](DocumentCommentLikeRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**NormalResponse**](NormalResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## updateDocumentDocumentUpdatePost

> NormalResponse updateDocumentDocumentUpdatePost(documentUpdateRequest, authorization, xUserTimezone)

Update Document

### Example

```ts
import {
  Configuration,
  DocumentApi,
} from '';
import type { UpdateDocumentDocumentUpdatePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new DocumentApi();

  const body = {
    // DocumentUpdateRequest
    documentUpdateRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies UpdateDocumentDocumentUpdatePostRequest;

  try {
    const data = await api.updateDocumentDocumentUpdatePost(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters


| Name | Type | Description  | Notes |
|------------- | ------------- | ------------- | -------------|
| **documentUpdateRequest** | [DocumentUpdateRequest](DocumentUpdateRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**NormalResponse**](NormalResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

