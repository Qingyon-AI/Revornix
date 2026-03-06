# DocumentApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**addLabelDocumentLabelCreatePost**](DocumentApi.md#addlabeldocumentlabelcreatepost) | **POST** /document/label/create | Add Label |
| [**createAiSummaryDocumentAiSummaryPost**](DocumentApi.md#createaisummarydocumentaisummarypost) | **POST** /document/ai/summary | Create Ai Summary |
| [**createDocumentDocumentCreatePost**](DocumentApi.md#createdocumentdocumentcreatepost) | **POST** /document/create | Create Document |
| [**createEmbeddingDocumentEmbeddingPost**](DocumentApi.md#createembeddingdocumentembeddingpost) | **POST** /document/embedding | Create Embedding |
| [**createNoteDocumentNoteCreatePost**](DocumentApi.md#createnotedocumentnotecreatepost) | **POST** /document/note/create | Create Note |
| [**deleteDocumentDocumentDeletePost**](DocumentApi.md#deletedocumentdocumentdeletepost) | **POST** /document/delete | Delete Document |
| [**deleteLabelDocumentLabelDeletePost**](DocumentApi.md#deletelabeldocumentlabeldeletepost) | **POST** /document/label/delete | Delete Label |
| [**deleteNoteDocumentNoteDeletePost**](DocumentApi.md#deletenotedocumentnotedeletepost) | **POST** /document/note/delete | Delete Note |
| [**generateGraphDocumentGraphGeneratePost**](DocumentApi.md#generategraphdocumentgraphgeneratepost) | **POST** /document/graph/generate | Generate Graph |
| [**generatePodcastDocumentPodcastGeneratePost**](DocumentApi.md#generatepodcastdocumentpodcastgeneratepost) | **POST** /document/podcast/generate | Generate Podcast |
| [**getDocumentDetailDocumentDetailPost**](DocumentApi.md#getdocumentdetaildocumentdetailpost) | **POST** /document/detail | Get Document Detail |
| [**getLabelSummaryDocumentLabelSummaryPost**](DocumentApi.md#getlabelsummarydocumentlabelsummarypost) | **POST** /document/label/summary | Get Label Summary |
| [**getMonthSummaryDocumentMonthSummaryPost**](DocumentApi.md#getmonthsummarydocumentmonthsummarypost) | **POST** /document/month/summary | Get Month Summary |
| [**listLabelDocumentLabelListPost**](DocumentApi.md#listlabeldocumentlabellistpost) | **POST** /document/label/list | List Label |
| [**readDocumentDocumentReadPost**](DocumentApi.md#readdocumentdocumentreadpost) | **POST** /document/read | Read Document |
| [**recentReadDocumentDocumentRecentSearchPost**](DocumentApi.md#recentreaddocumentdocumentrecentsearchpost) | **POST** /document/recent/search | Recent Read Document |
| [**searchAllMineDocumentsDocumentSearchMinePost**](DocumentApi.md#searchallminedocumentsdocumentsearchminepost) | **POST** /document/search/mine | Search All Mine Documents |
| [**searchKnowledgeVectorDocumentVectorSearchPost**](DocumentApi.md#searchknowledgevectordocumentvectorsearchpost) | **POST** /document/vector/search | Search Knowledge Vector |
| [**searchMyStarDocumentsDocumentStarSearchPost**](DocumentApi.md#searchmystardocumentsdocumentstarsearchpost) | **POST** /document/star/search | Search My Star Documents |
| [**searchNoteDocumentNoteSearchPost**](DocumentApi.md#searchnotedocumentnotesearchpost) | **POST** /document/note/search | Search Note |
| [**searchUserUnreadDocumentsDocumentUnreadSearchPost**](DocumentApi.md#searchuserunreaddocumentsdocumentunreadsearchpost) | **POST** /document/unread/search | Search User Unread Documents |
| [**starDocumentDocumentStarPost**](DocumentApi.md#stardocumentdocumentstarpost) | **POST** /document/star | Star Document |
| [**transcribeAudioDocumentDocumentTranscribePost**](DocumentApi.md#transcribeaudiodocumentdocumenttranscribepost) | **POST** /document/transcribe | Transcribe Audio Document |
| [**transformMarkdownDocumentMarkdownTransformPost**](DocumentApi.md#transformmarkdowndocumentmarkdowntransformpost) | **POST** /document/markdown/transform | Transform Markdown |
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

> InifiniteScrollPagnitionDocumentInfo recentReadDocumentDocumentRecentSearchPost(searchRecentReadRequest, authorization, xUserTimezone)

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

[**InifiniteScrollPagnitionDocumentInfo**](InifiniteScrollPagnitionDocumentInfo.md)

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

> InifiniteScrollPagnitionDocumentInfo searchAllMineDocumentsDocumentSearchMinePost(searchAllMyDocumentsRequest, authorization, xUserTimezone)

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

[**InifiniteScrollPagnitionDocumentInfo**](InifiniteScrollPagnitionDocumentInfo.md)

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

> InifiniteScrollPagnitionDocumentInfo searchMyStarDocumentsDocumentStarSearchPost(searchMyStarDocumentsRequest, authorization, xUserTimezone)

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

[**InifiniteScrollPagnitionDocumentInfo**](InifiniteScrollPagnitionDocumentInfo.md)

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

> InifiniteScrollPagnitionDocumentNoteInfo searchNoteDocumentNoteSearchPost(searchDocumentNoteRequest, authorization, xUserTimezone)

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

[**InifiniteScrollPagnitionDocumentNoteInfo**](InifiniteScrollPagnitionDocumentNoteInfo.md)

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

> InifiniteScrollPagnitionDocumentInfo searchUserUnreadDocumentsDocumentUnreadSearchPost(searchUnreadListRequest, authorization, xUserTimezone)

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

[**InifiniteScrollPagnitionDocumentInfo**](InifiniteScrollPagnitionDocumentInfo.md)

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

