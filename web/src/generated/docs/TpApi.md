# TpApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**addLabelTpSectionLabelCreatePost**](TpApi.md#addlabeltpsectionlabelcreatepost) | **POST** /tp/section/label/create | Add Label |
| [**createDocumentLabelTpDocumentLabelCreatePost**](TpApi.md#createdocumentlabeltpdocumentlabelcreatepost) | **POST** /tp/document/label/create | Create Document Label |
| [**createDocumentTpDocumentCreatePost**](TpApi.md#createdocumenttpdocumentcreatepost) | **POST** /tp/document/create | Create Document |
| [**createSectionTpSectionCreatePost**](TpApi.md#createsectiontpsectioncreatepost) | **POST** /tp/section/create | Create Section |
| [**deleteDocumentLabelTpDocumentLabelDeletePost**](TpApi.md#deletedocumentlabeltpdocumentlabeldeletepost) | **POST** /tp/document/label/delete | Delete Document Label |
| [**deleteDocumentTpDocumentDeletePost**](TpApi.md#deletedocumenttpdocumentdeletepost) | **POST** /tp/document/delete | Delete Document |
| [**deleteSectionLabelTpSectionLabelDeletePost**](TpApi.md#deletesectionlabeltpsectionlabeldeletepost) | **POST** /tp/section/label/delete | Delete Section Label |
| [**deleteSectionTpSectionDeletePost**](TpApi.md#deletesectiontpsectiondeletepost) | **POST** /tp/section/delete | Delete Section |
| [**getAllMineSectionsTpSectionMineAllPost**](TpApi.md#getallminesectionstpsectionmineallpost) | **POST** /tp/section/mine/all | Get All Mine Sections |
| [**getDocumentDetailTpDocumentDetailPost**](TpApi.md#getdocumentdetailtpdocumentdetailpost) | **POST** /tp/document/detail | Get Document Detail |
| [**getSectionDetailTpSectionDetailPost**](TpApi.md#getsectiondetailtpsectiondetailpost) | **POST** /tp/section/detail | Get Section Detail |
| [**getSectionDocumentsTpSectionDocumentsPost**](TpApi.md#getsectiondocumentstpsectiondocumentspost) | **POST** /tp/section/documents | Get Section Documents |
| [**getSectionPublishTpSectionPublishGetPost**](TpApi.md#getsectionpublishtpsectionpublishgetpost) | **POST** /tp/section/publish/get | Get Section Publish |
| [**listLabelTpDocumentLabelListPost**](TpApi.md#listlabeltpdocumentlabellistpost) | **POST** /tp/document/label/list | List Label |
| [**listSectionLabelTpSectionLabelListPost**](TpApi.md#listsectionlabeltpsectionlabellistpost) | **POST** /tp/section/label/list | List Section Label |
| [**publishSectionTpSectionPublishPost**](TpApi.md#publishsectiontpsectionpublishpost) | **POST** /tp/section/publish | Publish Section |
| [**republishSectionTpSectionRepublishPost**](TpApi.md#republishsectiontpsectionrepublishpost) | **POST** /tp/section/republish | Republish Section |
| [**searchDocumentVectorTpDocumentVectorSearchPost**](TpApi.md#searchdocumentvectortpdocumentvectorsearchpost) | **POST** /tp/document/vector/search | Search Document Vector |
| [**searchMineDocumentsTpDocumentSearchMinePost**](TpApi.md#searchminedocumentstpdocumentsearchminepost) | **POST** /tp/document/search/mine | Search Mine Documents |
| [**searchMineSectionsTpSectionMineSearchPost**](TpApi.md#searchminesectionstpsectionminesearchpost) | **POST** /tp/section/mine/search | Search Mine Sections |
| [**updateDocumentTpDocumentUpdatePost**](TpApi.md#updatedocumenttpdocumentupdatepost) | **POST** /tp/document/update | Update Document |
| [**updateSectionTpSectionUpdatePost**](TpApi.md#updatesectiontpsectionupdatepost) | **POST** /tp/section/update | Update Section |
| [**uploadFileSystemTpFileUploadPost**](TpApi.md#uploadfilesystemtpfileuploadpost) | **POST** /tp/file/upload | Upload File System |



## addLabelTpSectionLabelCreatePost

> CreateLabelResponse addLabelTpSectionLabelCreatePost(labelAddRequest, xUserTimezone, apiKey)

Add Label

### Example

```ts
import {
  Configuration,
  TpApi,
} from '';
import type { AddLabelTpSectionLabelCreatePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new TpApi();

  const body = {
    // LabelAddRequest
    labelAddRequest: ...,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
    // string (optional)
    apiKey: apiKey_example,
  } satisfies AddLabelTpSectionLabelCreatePostRequest;

  try {
    const data = await api.addLabelTpSectionLabelCreatePost(body);
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
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |
| **apiKey** | `string` |  | [Optional] [Defaults to `undefined`] |

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


## createDocumentLabelTpDocumentLabelCreatePost

> CreateLabelResponse createDocumentLabelTpDocumentLabelCreatePost(labelAddRequest, xUserTimezone, apiKey)

Create Document Label

### Example

```ts
import {
  Configuration,
  TpApi,
} from '';
import type { CreateDocumentLabelTpDocumentLabelCreatePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new TpApi();

  const body = {
    // LabelAddRequest
    labelAddRequest: ...,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
    // string (optional)
    apiKey: apiKey_example,
  } satisfies CreateDocumentLabelTpDocumentLabelCreatePostRequest;

  try {
    const data = await api.createDocumentLabelTpDocumentLabelCreatePost(body);
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
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |
| **apiKey** | `string` |  | [Optional] [Defaults to `undefined`] |

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


## createDocumentTpDocumentCreatePost

> DocumentCreateResponse createDocumentTpDocumentCreatePost(apiDocumentCreateRequest, xUserTimezone, apiKey)

Create Document

### Example

```ts
import {
  Configuration,
  TpApi,
} from '';
import type { CreateDocumentTpDocumentCreatePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new TpApi();

  const body = {
    // ApiDocumentCreateRequest
    apiDocumentCreateRequest: ...,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
    // string (optional)
    apiKey: apiKey_example,
  } satisfies CreateDocumentTpDocumentCreatePostRequest;

  try {
    const data = await api.createDocumentTpDocumentCreatePost(body);
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
| **apiDocumentCreateRequest** | [ApiDocumentCreateRequest](ApiDocumentCreateRequest.md) |  | |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |
| **apiKey** | `string` |  | [Optional] [Defaults to `undefined`] |

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


## createSectionTpSectionCreatePost

> SectionCreateResponse createSectionTpSectionCreatePost(sectionCreateRequest, xUserTimezone, apiKey)

Create Section

### Example

```ts
import {
  Configuration,
  TpApi,
} from '';
import type { CreateSectionTpSectionCreatePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new TpApi();

  const body = {
    // SectionCreateRequest
    sectionCreateRequest: ...,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
    // string (optional)
    apiKey: apiKey_example,
  } satisfies CreateSectionTpSectionCreatePostRequest;

  try {
    const data = await api.createSectionTpSectionCreatePost(body);
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
| **sectionCreateRequest** | [SectionCreateRequest](SectionCreateRequest.md) |  | |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |
| **apiKey** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**SectionCreateResponse**](SectionCreateResponse.md)

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


## deleteDocumentLabelTpDocumentLabelDeletePost

> NormalResponse deleteDocumentLabelTpDocumentLabelDeletePost(labelDeleteRequest, xUserTimezone, apiKey)

Delete Document Label

### Example

```ts
import {
  Configuration,
  TpApi,
} from '';
import type { DeleteDocumentLabelTpDocumentLabelDeletePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new TpApi();

  const body = {
    // LabelDeleteRequest
    labelDeleteRequest: ...,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
    // string (optional)
    apiKey: apiKey_example,
  } satisfies DeleteDocumentLabelTpDocumentLabelDeletePostRequest;

  try {
    const data = await api.deleteDocumentLabelTpDocumentLabelDeletePost(body);
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
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |
| **apiKey** | `string` |  | [Optional] [Defaults to `undefined`] |

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


## deleteDocumentTpDocumentDeletePost

> NormalResponse deleteDocumentTpDocumentDeletePost(documentDeleteRequest, xUserTimezone, apiKey)

Delete Document

### Example

```ts
import {
  Configuration,
  TpApi,
} from '';
import type { DeleteDocumentTpDocumentDeletePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new TpApi();

  const body = {
    // DocumentDeleteRequest
    documentDeleteRequest: ...,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
    // string (optional)
    apiKey: apiKey_example,
  } satisfies DeleteDocumentTpDocumentDeletePostRequest;

  try {
    const data = await api.deleteDocumentTpDocumentDeletePost(body);
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
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |
| **apiKey** | `string` |  | [Optional] [Defaults to `undefined`] |

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


## deleteSectionLabelTpSectionLabelDeletePost

> NormalResponse deleteSectionLabelTpSectionLabelDeletePost(labelDeleteRequest, xUserTimezone, apiKey)

Delete Section Label

### Example

```ts
import {
  Configuration,
  TpApi,
} from '';
import type { DeleteSectionLabelTpSectionLabelDeletePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new TpApi();

  const body = {
    // LabelDeleteRequest
    labelDeleteRequest: ...,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
    // string (optional)
    apiKey: apiKey_example,
  } satisfies DeleteSectionLabelTpSectionLabelDeletePostRequest;

  try {
    const data = await api.deleteSectionLabelTpSectionLabelDeletePost(body);
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
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |
| **apiKey** | `string` |  | [Optional] [Defaults to `undefined`] |

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


## deleteSectionTpSectionDeletePost

> NormalResponse deleteSectionTpSectionDeletePost(sectionDeleteRequest, xUserTimezone, apiKey)

Delete Section

### Example

```ts
import {
  Configuration,
  TpApi,
} from '';
import type { DeleteSectionTpSectionDeletePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new TpApi();

  const body = {
    // SectionDeleteRequest
    sectionDeleteRequest: ...,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
    // string (optional)
    apiKey: apiKey_example,
  } satisfies DeleteSectionTpSectionDeletePostRequest;

  try {
    const data = await api.deleteSectionTpSectionDeletePost(body);
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
| **sectionDeleteRequest** | [SectionDeleteRequest](SectionDeleteRequest.md) |  | |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |
| **apiKey** | `string` |  | [Optional] [Defaults to `undefined`] |

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


## getAllMineSectionsTpSectionMineAllPost

> AllMySectionsResponse getAllMineSectionsTpSectionMineAllPost(xUserTimezone, apiKey)

Get All Mine Sections

### Example

```ts
import {
  Configuration,
  TpApi,
} from '';
import type { GetAllMineSectionsTpSectionMineAllPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new TpApi();

  const body = {
    // string (optional)
    xUserTimezone: xUserTimezone_example,
    // string (optional)
    apiKey: apiKey_example,
  } satisfies GetAllMineSectionsTpSectionMineAllPostRequest;

  try {
    const data = await api.getAllMineSectionsTpSectionMineAllPost(body);
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
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |
| **apiKey** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**AllMySectionsResponse**](AllMySectionsResponse.md)

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


## getDocumentDetailTpDocumentDetailPost

> DocumentDetailResponse getDocumentDetailTpDocumentDetailPost(documentDetailRequest, xUserTimezone, apiKey)

Get Document Detail

### Example

```ts
import {
  Configuration,
  TpApi,
} from '';
import type { GetDocumentDetailTpDocumentDetailPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new TpApi();

  const body = {
    // DocumentDetailRequest
    documentDetailRequest: ...,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
    // string (optional)
    apiKey: apiKey_example,
  } satisfies GetDocumentDetailTpDocumentDetailPostRequest;

  try {
    const data = await api.getDocumentDetailTpDocumentDetailPost(body);
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
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |
| **apiKey** | `string` |  | [Optional] [Defaults to `undefined`] |

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


## getSectionDetailTpSectionDetailPost

> SectionInfo getSectionDetailTpSectionDetailPost(sectionDetailRequest, xUserTimezone, apiKey)

Get Section Detail

### Example

```ts
import {
  Configuration,
  TpApi,
} from '';
import type { GetSectionDetailTpSectionDetailPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new TpApi();

  const body = {
    // SectionDetailRequest
    sectionDetailRequest: ...,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
    // string (optional)
    apiKey: apiKey_example,
  } satisfies GetSectionDetailTpSectionDetailPostRequest;

  try {
    const data = await api.getSectionDetailTpSectionDetailPost(body);
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
| **sectionDetailRequest** | [SectionDetailRequest](SectionDetailRequest.md) |  | |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |
| **apiKey** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**SectionInfo**](SectionInfo.md)

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


## getSectionDocumentsTpSectionDocumentsPost

> InifiniteScrollPagnitionSectionDocumentInfo getSectionDocumentsTpSectionDocumentsPost(sectionDocumentRequest, xUserTimezone, apiKey)

Get Section Documents

### Example

```ts
import {
  Configuration,
  TpApi,
} from '';
import type { GetSectionDocumentsTpSectionDocumentsPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new TpApi();

  const body = {
    // SectionDocumentRequest
    sectionDocumentRequest: ...,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
    // string (optional)
    apiKey: apiKey_example,
  } satisfies GetSectionDocumentsTpSectionDocumentsPostRequest;

  try {
    const data = await api.getSectionDocumentsTpSectionDocumentsPost(body);
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
| **sectionDocumentRequest** | [SectionDocumentRequest](SectionDocumentRequest.md) |  | |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |
| **apiKey** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**InifiniteScrollPagnitionSectionDocumentInfo**](InifiniteScrollPagnitionSectionDocumentInfo.md)

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


## getSectionPublishTpSectionPublishGetPost

> SectionPublishGetResponse getSectionPublishTpSectionPublishGetPost(sectionPublishGetRequest, xUserTimezone, apiKey)

Get Section Publish

### Example

```ts
import {
  Configuration,
  TpApi,
} from '';
import type { GetSectionPublishTpSectionPublishGetPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new TpApi();

  const body = {
    // SectionPublishGetRequest
    sectionPublishGetRequest: ...,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
    // string (optional)
    apiKey: apiKey_example,
  } satisfies GetSectionPublishTpSectionPublishGetPostRequest;

  try {
    const data = await api.getSectionPublishTpSectionPublishGetPost(body);
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
| **sectionPublishGetRequest** | [SectionPublishGetRequest](SectionPublishGetRequest.md) |  | |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |
| **apiKey** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**SectionPublishGetResponse**](SectionPublishGetResponse.md)

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


## listLabelTpDocumentLabelListPost

> SchemasDocumentLabelListResponse listLabelTpDocumentLabelListPost(xUserTimezone, apiKey)

List Label

### Example

```ts
import {
  Configuration,
  TpApi,
} from '';
import type { ListLabelTpDocumentLabelListPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new TpApi();

  const body = {
    // string (optional)
    xUserTimezone: xUserTimezone_example,
    // string (optional)
    apiKey: apiKey_example,
  } satisfies ListLabelTpDocumentLabelListPostRequest;

  try {
    const data = await api.listLabelTpDocumentLabelListPost(body);
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
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |
| **apiKey** | `string` |  | [Optional] [Defaults to `undefined`] |

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


## listSectionLabelTpSectionLabelListPost

> SchemasSectionLabelListResponse listSectionLabelTpSectionLabelListPost(xUserTimezone, apiKey)

List Section Label

### Example

```ts
import {
  Configuration,
  TpApi,
} from '';
import type { ListSectionLabelTpSectionLabelListPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new TpApi();

  const body = {
    // string (optional)
    xUserTimezone: xUserTimezone_example,
    // string (optional)
    apiKey: apiKey_example,
  } satisfies ListSectionLabelTpSectionLabelListPostRequest;

  try {
    const data = await api.listSectionLabelTpSectionLabelListPost(body);
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
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |
| **apiKey** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**SchemasSectionLabelListResponse**](SchemasSectionLabelListResponse.md)

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


## publishSectionTpSectionPublishPost

> NormalResponse publishSectionTpSectionPublishPost(sectionPublishRequest, xUserTimezone, apiKey)

Publish Section

### Example

```ts
import {
  Configuration,
  TpApi,
} from '';
import type { PublishSectionTpSectionPublishPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new TpApi();

  const body = {
    // SectionPublishRequest
    sectionPublishRequest: ...,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
    // string (optional)
    apiKey: apiKey_example,
  } satisfies PublishSectionTpSectionPublishPostRequest;

  try {
    const data = await api.publishSectionTpSectionPublishPost(body);
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
| **sectionPublishRequest** | [SectionPublishRequest](SectionPublishRequest.md) |  | |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |
| **apiKey** | `string` |  | [Optional] [Defaults to `undefined`] |

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


## republishSectionTpSectionRepublishPost

> NormalResponse republishSectionTpSectionRepublishPost(sectionRePublishRequest, xUserTimezone, apiKey)

Republish Section

### Example

```ts
import {
  Configuration,
  TpApi,
} from '';
import type { RepublishSectionTpSectionRepublishPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new TpApi();

  const body = {
    // SectionRePublishRequest
    sectionRePublishRequest: ...,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
    // string (optional)
    apiKey: apiKey_example,
  } satisfies RepublishSectionTpSectionRepublishPostRequest;

  try {
    const data = await api.republishSectionTpSectionRepublishPost(body);
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
| **sectionRePublishRequest** | [SectionRePublishRequest](SectionRePublishRequest.md) |  | |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |
| **apiKey** | `string` |  | [Optional] [Defaults to `undefined`] |

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


## searchDocumentVectorTpDocumentVectorSearchPost

> VectorSearchResponse searchDocumentVectorTpDocumentVectorSearchPost(vectorSearchRequest, xUserTimezone, apiKey)

Search Document Vector

### Example

```ts
import {
  Configuration,
  TpApi,
} from '';
import type { SearchDocumentVectorTpDocumentVectorSearchPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new TpApi();

  const body = {
    // VectorSearchRequest
    vectorSearchRequest: ...,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
    // string (optional)
    apiKey: apiKey_example,
  } satisfies SearchDocumentVectorTpDocumentVectorSearchPostRequest;

  try {
    const data = await api.searchDocumentVectorTpDocumentVectorSearchPost(body);
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
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |
| **apiKey** | `string` |  | [Optional] [Defaults to `undefined`] |

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


## searchMineDocumentsTpDocumentSearchMinePost

> InifiniteScrollPagnitionDocumentInfo searchMineDocumentsTpDocumentSearchMinePost(searchAllMyDocumentsRequest, xUserTimezone, apiKey)

Search Mine Documents

### Example

```ts
import {
  Configuration,
  TpApi,
} from '';
import type { SearchMineDocumentsTpDocumentSearchMinePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new TpApi();

  const body = {
    // SearchAllMyDocumentsRequest
    searchAllMyDocumentsRequest: ...,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
    // string (optional)
    apiKey: apiKey_example,
  } satisfies SearchMineDocumentsTpDocumentSearchMinePostRequest;

  try {
    const data = await api.searchMineDocumentsTpDocumentSearchMinePost(body);
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
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |
| **apiKey** | `string` |  | [Optional] [Defaults to `undefined`] |

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


## searchMineSectionsTpSectionMineSearchPost

> InifiniteScrollPagnitionSectionInfo searchMineSectionsTpSectionMineSearchPost(searchMineSectionsRequest, xUserTimezone, apiKey)

Search Mine Sections

### Example

```ts
import {
  Configuration,
  TpApi,
} from '';
import type { SearchMineSectionsTpSectionMineSearchPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new TpApi();

  const body = {
    // SearchMineSectionsRequest
    searchMineSectionsRequest: ...,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
    // string (optional)
    apiKey: apiKey_example,
  } satisfies SearchMineSectionsTpSectionMineSearchPostRequest;

  try {
    const data = await api.searchMineSectionsTpSectionMineSearchPost(body);
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
| **searchMineSectionsRequest** | [SearchMineSectionsRequest](SearchMineSectionsRequest.md) |  | |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |
| **apiKey** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**InifiniteScrollPagnitionSectionInfo**](InifiniteScrollPagnitionSectionInfo.md)

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


## updateDocumentTpDocumentUpdatePost

> NormalResponse updateDocumentTpDocumentUpdatePost(documentUpdateRequest, xUserTimezone, apiKey)

Update Document

### Example

```ts
import {
  Configuration,
  TpApi,
} from '';
import type { UpdateDocumentTpDocumentUpdatePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new TpApi();

  const body = {
    // DocumentUpdateRequest
    documentUpdateRequest: ...,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
    // string (optional)
    apiKey: apiKey_example,
  } satisfies UpdateDocumentTpDocumentUpdatePostRequest;

  try {
    const data = await api.updateDocumentTpDocumentUpdatePost(body);
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
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |
| **apiKey** | `string` |  | [Optional] [Defaults to `undefined`] |

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


## updateSectionTpSectionUpdatePost

> NormalResponse updateSectionTpSectionUpdatePost(sectionUpdateRequest, xUserTimezone, apiKey)

Update Section

### Example

```ts
import {
  Configuration,
  TpApi,
} from '';
import type { UpdateSectionTpSectionUpdatePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new TpApi();

  const body = {
    // SectionUpdateRequest
    sectionUpdateRequest: ...,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
    // string (optional)
    apiKey: apiKey_example,
  } satisfies UpdateSectionTpSectionUpdatePostRequest;

  try {
    const data = await api.updateSectionTpSectionUpdatePost(body);
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
| **sectionUpdateRequest** | [SectionUpdateRequest](SectionUpdateRequest.md) |  | |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |
| **apiKey** | `string` |  | [Optional] [Defaults to `undefined`] |

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


## uploadFileSystemTpFileUploadPost

> NormalResponse uploadFileSystemTpFileUploadPost(file, filePath, contentType, xUserTimezone, apiKey)

Upload File System

### Example

```ts
import {
  Configuration,
  TpApi,
} from '';
import type { UploadFileSystemTpFileUploadPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new TpApi();

  const body = {
    // Blob
    file: BINARY_DATA_HERE,
    // string
    filePath: filePath_example,
    // string
    contentType: contentType_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
    // string (optional)
    apiKey: apiKey_example,
  } satisfies UploadFileSystemTpFileUploadPostRequest;

  try {
    const data = await api.uploadFileSystemTpFileUploadPost(body);
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
| **file** | `Blob` |  | [Defaults to `undefined`] |
| **filePath** | `string` |  | [Defaults to `undefined`] |
| **contentType** | `string` |  | [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |
| **apiKey** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**NormalResponse**](NormalResponse.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `multipart/form-data`
- **Accept**: `application/json`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | Successful Response |  -  |
| **422** | Validation Error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

