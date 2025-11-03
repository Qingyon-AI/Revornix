# ApiKeyApi

All URIs are relative to *http://localhost:8001/api/main-service*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**createApiKeyApiKeyCreatePost**](ApiKeyApi.md#createapikeyapikeycreatepost) | **POST** /api-key/create | Create Api Key |
| [**deleteApiKeyApiKeyDeletePost**](ApiKeyApi.md#deleteapikeyapikeydeletepost) | **POST** /api-key/delete | Delete Api Key |
| [**searchApiKeyApiKeySearchPost**](ApiKeyApi.md#searchapikeyapikeysearchpost) | **POST** /api-key/search | Search Api Key |



## createApiKeyApiKeyCreatePost

> ApiKeyCreateResponse createApiKeyApiKeyCreatePost(apiKeyCreateRequest, authorization, xForwardedFor)

Create Api Key

### Example

```ts
import {
  Configuration,
  ApiKeyApi,
} from '';
import type { CreateApiKeyApiKeyCreatePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new ApiKeyApi();

  const body = {
    // ApiKeyCreateRequest
    apiKeyCreateRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies CreateApiKeyApiKeyCreatePostRequest;

  try {
    const data = await api.createApiKeyApiKeyCreatePost(body);
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
| **apiKeyCreateRequest** | [ApiKeyCreateRequest](ApiKeyCreateRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xForwardedFor** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**ApiKeyCreateResponse**](ApiKeyCreateResponse.md)

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


## deleteApiKeyApiKeyDeletePost

> NormalResponse deleteApiKeyApiKeyDeletePost(apiKeysDeleteRequest, authorization, xForwardedFor)

Delete Api Key

### Example

```ts
import {
  Configuration,
  ApiKeyApi,
} from '';
import type { DeleteApiKeyApiKeyDeletePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new ApiKeyApi();

  const body = {
    // ApiKeysDeleteRequest
    apiKeysDeleteRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies DeleteApiKeyApiKeyDeletePostRequest;

  try {
    const data = await api.deleteApiKeyApiKeyDeletePost(body);
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
| **apiKeysDeleteRequest** | [ApiKeysDeleteRequest](ApiKeysDeleteRequest.md) |  | |
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


## searchApiKeyApiKeySearchPost

> PaginationApiKeyInfo searchApiKeyApiKeySearchPost(searchApiKeysRequest, authorization, xForwardedFor)

Search Api Key

### Example

```ts
import {
  Configuration,
  ApiKeyApi,
} from '';
import type { SearchApiKeyApiKeySearchPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new ApiKeyApi();

  const body = {
    // SearchApiKeysRequest
    searchApiKeysRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies SearchApiKeyApiKeySearchPostRequest;

  try {
    const data = await api.searchApiKeyApiKeySearchPost(body);
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
| **searchApiKeysRequest** | [SearchApiKeysRequest](SearchApiKeysRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xForwardedFor** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**PaginationApiKeyInfo**](PaginationApiKeyInfo.md)

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

