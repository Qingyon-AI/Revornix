# EngineApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**createEngineEngineCreatePost**](EngineApi.md#createengineenginecreatepost) | **POST** /engine/create | Create Engine |
| [**deleteEngineEngineDeletePost**](EngineApi.md#deleteengineenginedeletepost) | **POST** /engine/delete | Delete Engine |
| [**getEngineDetailEngineDetailPost**](EngineApi.md#getenginedetailenginedetailpost) | **POST** /engine/detail | Get Engine Detail |
| [**installEngineEngineForkPost**](EngineApi.md#installengineengineforkpost) | **POST** /engine/fork | Install Engine |
| [**provideDocumentParseEngineEngineProvidedPost**](EngineApi.md#providedocumentparseengineengineprovidedpost) | **POST** /engine/provided | Provide Document Parse Engine |
| [**searchDocumentParseEngineEngineCommunityPost**](EngineApi.md#searchdocumentparseengineenginecommunitypost) | **POST** /engine/community | Search Document Parse Engine |
| [**searchUsableEngineEngineUsablePost**](EngineApi.md#searchusableengineengineusablepost) | **POST** /engine/usable | Search Usable Engine |
| [**updateEngineEngineUpdatePost**](EngineApi.md#updateengineengineupdatepost) | **POST** /engine/update | Update Engine |



## createEngineEngineCreatePost

> NormalResponse createEngineEngineCreatePost(engineCreateRequest, authorization, xUserTimezone)

Create Engine

创建引擎

### Example

```ts
import {
  Configuration,
  EngineApi,
} from '';
import type { CreateEngineEngineCreatePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new EngineApi();

  const body = {
    // EngineCreateRequest
    engineCreateRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies CreateEngineEngineCreatePostRequest;

  try {
    const data = await api.createEngineEngineCreatePost(body);
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
| **engineCreateRequest** | [EngineCreateRequest](EngineCreateRequest.md) |  | |
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


## deleteEngineEngineDeletePost

> NormalResponse deleteEngineEngineDeletePost(engineDeleteRequest, authorization, xUserTimezone)

Delete Engine

### Example

```ts
import {
  Configuration,
  EngineApi,
} from '';
import type { DeleteEngineEngineDeletePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new EngineApi();

  const body = {
    // EngineDeleteRequest
    engineDeleteRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies DeleteEngineEngineDeletePostRequest;

  try {
    const data = await api.deleteEngineEngineDeletePost(body);
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
| **engineDeleteRequest** | [EngineDeleteRequest](EngineDeleteRequest.md) |  | |
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


## getEngineDetailEngineDetailPost

> EngineDetail getEngineDetailEngineDetailPost(engineDetailRequest, authorization, xUserTimezone)

Get Engine Detail

### Example

```ts
import {
  Configuration,
  EngineApi,
} from '';
import type { GetEngineDetailEngineDetailPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new EngineApi();

  const body = {
    // EngineDetailRequest
    engineDetailRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies GetEngineDetailEngineDetailPostRequest;

  try {
    const data = await api.getEngineDetailEngineDetailPost(body);
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
| **engineDetailRequest** | [EngineDetailRequest](EngineDetailRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**EngineDetail**](EngineDetail.md)

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


## installEngineEngineForkPost

> NormalResponse installEngineEngineForkPost(engineForkRequest, authorization, xUserTimezone)

Install Engine

### Example

```ts
import {
  Configuration,
  EngineApi,
} from '';
import type { InstallEngineEngineForkPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new EngineApi();

  const body = {
    // EngineForkRequest
    engineForkRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies InstallEngineEngineForkPostRequest;

  try {
    const data = await api.installEngineEngineForkPost(body);
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
| **engineForkRequest** | [EngineForkRequest](EngineForkRequest.md) |  | |
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


## provideDocumentParseEngineEngineProvidedPost

> EngineProvidedSearchResponse provideDocumentParseEngineEngineProvidedPost(engineProvidedSearchRequest, authorization, xUserTimezone)

Provide Document Parse Engine

### Example

```ts
import {
  Configuration,
  EngineApi,
} from '';
import type { ProvideDocumentParseEngineEngineProvidedPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new EngineApi();

  const body = {
    // EngineProvidedSearchRequest
    engineProvidedSearchRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies ProvideDocumentParseEngineEngineProvidedPostRequest;

  try {
    const data = await api.provideDocumentParseEngineEngineProvidedPost(body);
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
| **engineProvidedSearchRequest** | [EngineProvidedSearchRequest](EngineProvidedSearchRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**EngineProvidedSearchResponse**](EngineProvidedSearchResponse.md)

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


## searchDocumentParseEngineEngineCommunityPost

> InifiniteScrollPagnitionEngineInfo searchDocumentParseEngineEngineCommunityPost(communityEngineSearchRequest, authorization, xUserTimezone)

Search Document Parse Engine

搜索当前所有我可以使用的引擎 包含我创建的和公开的

### Example

```ts
import {
  Configuration,
  EngineApi,
} from '';
import type { SearchDocumentParseEngineEngineCommunityPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new EngineApi();

  const body = {
    // CommunityEngineSearchRequest
    communityEngineSearchRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies SearchDocumentParseEngineEngineCommunityPostRequest;

  try {
    const data = await api.searchDocumentParseEngineEngineCommunityPost(body);
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
| **communityEngineSearchRequest** | [CommunityEngineSearchRequest](CommunityEngineSearchRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**InifiniteScrollPagnitionEngineInfo**](InifiniteScrollPagnitionEngineInfo.md)

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


## searchUsableEngineEngineUsablePost

> UsableEnginesResponse searchUsableEngineEngineUsablePost(usableEngineSearchRequest, authorization, xUserTimezone)

Search Usable Engine

搜索当前所有我配置好的引擎 我自己的和我fork的

### Example

```ts
import {
  Configuration,
  EngineApi,
} from '';
import type { SearchUsableEngineEngineUsablePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new EngineApi();

  const body = {
    // UsableEngineSearchRequest
    usableEngineSearchRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies SearchUsableEngineEngineUsablePostRequest;

  try {
    const data = await api.searchUsableEngineEngineUsablePost(body);
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
| **usableEngineSearchRequest** | [UsableEngineSearchRequest](UsableEngineSearchRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**UsableEnginesResponse**](UsableEnginesResponse.md)

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


## updateEngineEngineUpdatePost

> NormalResponse updateEngineEngineUpdatePost(engineUpdateRequest, authorization, xUserTimezone)

Update Engine

### Example

```ts
import {
  Configuration,
  EngineApi,
} from '';
import type { UpdateEngineEngineUpdatePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new EngineApi();

  const body = {
    // EngineUpdateRequest
    engineUpdateRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies UpdateEngineEngineUpdatePostRequest;

  try {
    const data = await api.updateEngineEngineUpdatePost(body);
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
| **engineUpdateRequest** | [EngineUpdateRequest](EngineUpdateRequest.md) |  | |
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

