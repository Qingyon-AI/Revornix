# TpApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**addLabelTpSectionLabelCreatePost**](TpApi.md#addlabeltpsectionlabelcreatepost) | **POST** /tp/section/label/create | Add Label |
| [**createDocumentLabelTpDocumentLabelCreatePost**](TpApi.md#createdocumentlabeltpdocumentlabelcreatepost) | **POST** /tp/document/label/create | Create Document Label |
| [**createDocumentTpDocumentCreatePost**](TpApi.md#createdocumenttpdocumentcreatepost) | **POST** /tp/document/create | Create Document |
| [**createSectionTpSectionCreatePost**](TpApi.md#createsectiontpsectioncreatepost) | **POST** /tp/section/create | Create Section |
| [**getAllMineSectionsTpSectionMineAllPost**](TpApi.md#getallminesectionstpsectionmineallpost) | **POST** /tp/section/mine/all | Get All Mine Sections |
| [**listLabelTpDocumentLabelListPost**](TpApi.md#listlabeltpdocumentlabellistpost) | **POST** /tp/document/label/list | List Label |
| [**searchKnowledgeVectorTpDocumentVectorSearchPost**](TpApi.md#searchknowledgevectortpdocumentvectorsearchpost) | **POST** /tp/document/vector/search | Search Knowledge Vector |
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

> DocumentCreateResponse createDocumentTpDocumentCreatePost(documentCreateRequest, xUserTimezone, apiKey)

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
    // DocumentCreateRequest
    documentCreateRequest: ...,
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
| **documentCreateRequest** | [DocumentCreateRequest](DocumentCreateRequest.md) |  | |
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


## searchKnowledgeVectorTpDocumentVectorSearchPost

> VectorSearchResponse searchKnowledgeVectorTpDocumentVectorSearchPost(vectorSearchRequest, xUserTimezone, apiKey)

Search Knowledge Vector

### Example

```ts
import {
  Configuration,
  TpApi,
} from '';
import type { SearchKnowledgeVectorTpDocumentVectorSearchPostRequest } from '';

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
  } satisfies SearchKnowledgeVectorTpDocumentVectorSearchPostRequest;

  try {
    const data = await api.searchKnowledgeVectorTpDocumentVectorSearchPost(body);
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
