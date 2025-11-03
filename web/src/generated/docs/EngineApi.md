# EngineApi

All URIs are relative to *http://localhost:8001/api/main-service*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**deleteEngineEngineDeletePost**](EngineApi.md#deleteengineenginedeletepost) | **POST** /engine/delete | Delete Engine |
| [**installEngineEngineInstallPost**](EngineApi.md#installengineengineinstallpost) | **POST** /engine/install | Install Engine |
| [**provideDocumentParseEngineEngineProvidePost**](EngineApi.md#providedocumentparseengineengineprovidepost) | **POST** /engine/provide | Provide Document Parse Engine |
| [**searchDocumentParseEngineEngineMinePost**](EngineApi.md#searchdocumentparseengineengineminepost) | **POST** /engine/mine | Search Document Parse Engine |
| [**updateEngineEngineUpdatePost**](EngineApi.md#updateengineengineupdatepost) | **POST** /engine/update | Update Engine |



## deleteEngineEngineDeletePost

> NormalResponse deleteEngineEngineDeletePost(engineDeleteRequest, authorization, xForwardedFor)

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
    xForwardedFor: xForwardedFor_example,
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
| **xForwardedFor** | `string` |  | [Optional] [Defaults to `undefined`] |

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


## installEngineEngineInstallPost

> EngineInstallResponse installEngineEngineInstallPost(engineInstallRequest, authorization, xForwardedFor)

Install Engine

### Example

```ts
import {
  Configuration,
  EngineApi,
} from '';
import type { InstallEngineEngineInstallPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new EngineApi();

  const body = {
    // EngineInstallRequest
    engineInstallRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies InstallEngineEngineInstallPostRequest;

  try {
    const data = await api.installEngineEngineInstallPost(body);
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
| **engineInstallRequest** | [EngineInstallRequest](EngineInstallRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xForwardedFor** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**EngineInstallResponse**](EngineInstallResponse.md)

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


## provideDocumentParseEngineEngineProvidePost

> ProvideEngineSearchResponse provideDocumentParseEngineEngineProvidePost(engineSearchRequest, authorization, xForwardedFor)

Provide Document Parse Engine

### Example

```ts
import {
  Configuration,
  EngineApi,
} from '';
import type { ProvideDocumentParseEngineEngineProvidePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new EngineApi();

  const body = {
    // EngineSearchRequest
    engineSearchRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies ProvideDocumentParseEngineEngineProvidePostRequest;

  try {
    const data = await api.provideDocumentParseEngineEngineProvidePost(body);
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
| **engineSearchRequest** | [EngineSearchRequest](EngineSearchRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xForwardedFor** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**ProvideEngineSearchResponse**](ProvideEngineSearchResponse.md)

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


## searchDocumentParseEngineEngineMinePost

> MineEngineSearchResponse searchDocumentParseEngineEngineMinePost(engineSearchRequest, authorization, xForwardedFor)

Search Document Parse Engine

### Example

```ts
import {
  Configuration,
  EngineApi,
} from '';
import type { SearchDocumentParseEngineEngineMinePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new EngineApi();

  const body = {
    // EngineSearchRequest
    engineSearchRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies SearchDocumentParseEngineEngineMinePostRequest;

  try {
    const data = await api.searchDocumentParseEngineEngineMinePost(body);
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
| **engineSearchRequest** | [EngineSearchRequest](EngineSearchRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xForwardedFor** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**MineEngineSearchResponse**](MineEngineSearchResponse.md)

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

> NormalResponse updateEngineEngineUpdatePost(engineUpdateRequest, authorization, xForwardedFor)

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
    xForwardedFor: xForwardedFor_example,
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
| **xForwardedFor** | `string` |  | [Optional] [Defaults to `undefined`] |

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

