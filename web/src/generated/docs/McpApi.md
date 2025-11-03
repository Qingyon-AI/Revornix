# McpApi

All URIs are relative to *http://localhost:8001/api/main-service*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**createServerMcpServerCreatePost**](McpApi.md#createservermcpservercreatepost) | **POST** /mcp/server/create | Create Server |
| [**deleteServerMcpServerDeletePost**](McpApi.md#deleteservermcpserverdeletepost) | **POST** /mcp/server/delete | Delete Server |
| [**getMcpServerDetailMcpServerDetailPost**](McpApi.md#getmcpserverdetailmcpserverdetailpost) | **POST** /mcp/server/detail | Get Mcp Server Detail |
| [**getMcpServerListMcpServerSearchPost**](McpApi.md#getmcpserverlistmcpserversearchpost) | **POST** /mcp/server/search | Get Mcp Server List |
| [**updateServerMcpServerUpdatePost**](McpApi.md#updateservermcpserverupdatepost) | **POST** /mcp/server/update | Update Server |



## createServerMcpServerCreatePost

> NormalResponse createServerMcpServerCreatePost(mCPServerCreateRequest, authorization, xForwardedFor)

Create Server

### Example

```ts
import {
  Configuration,
  McpApi,
} from '';
import type { CreateServerMcpServerCreatePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new McpApi();

  const body = {
    // MCPServerCreateRequest
    mCPServerCreateRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies CreateServerMcpServerCreatePostRequest;

  try {
    const data = await api.createServerMcpServerCreatePost(body);
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
| **mCPServerCreateRequest** | [MCPServerCreateRequest](MCPServerCreateRequest.md) |  | |
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


## deleteServerMcpServerDeletePost

> NormalResponse deleteServerMcpServerDeletePost(mCPServerDeleteRequest, authorization, xForwardedFor)

Delete Server

### Example

```ts
import {
  Configuration,
  McpApi,
} from '';
import type { DeleteServerMcpServerDeletePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new McpApi();

  const body = {
    // MCPServerDeleteRequest
    mCPServerDeleteRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies DeleteServerMcpServerDeletePostRequest;

  try {
    const data = await api.deleteServerMcpServerDeletePost(body);
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
| **mCPServerDeleteRequest** | [MCPServerDeleteRequest](MCPServerDeleteRequest.md) |  | |
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


## getMcpServerDetailMcpServerDetailPost

> MCPServerInfo getMcpServerDetailMcpServerDetailPost(mCPServerDetailRequest, authorization, xForwardedFor)

Get Mcp Server Detail

### Example

```ts
import {
  Configuration,
  McpApi,
} from '';
import type { GetMcpServerDetailMcpServerDetailPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new McpApi();

  const body = {
    // MCPServerDetailRequest
    mCPServerDetailRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies GetMcpServerDetailMcpServerDetailPostRequest;

  try {
    const data = await api.getMcpServerDetailMcpServerDetailPost(body);
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
| **mCPServerDetailRequest** | [MCPServerDetailRequest](MCPServerDetailRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xForwardedFor** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**MCPServerInfo**](MCPServerInfo.md)

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


## getMcpServerListMcpServerSearchPost

> MCPServerSearchResponse getMcpServerListMcpServerSearchPost(mCPServerSearchRequest, authorization, xForwardedFor)

Get Mcp Server List

### Example

```ts
import {
  Configuration,
  McpApi,
} from '';
import type { GetMcpServerListMcpServerSearchPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new McpApi();

  const body = {
    // MCPServerSearchRequest
    mCPServerSearchRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies GetMcpServerListMcpServerSearchPostRequest;

  try {
    const data = await api.getMcpServerListMcpServerSearchPost(body);
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
| **mCPServerSearchRequest** | [MCPServerSearchRequest](MCPServerSearchRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xForwardedFor** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**MCPServerSearchResponse**](MCPServerSearchResponse.md)

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


## updateServerMcpServerUpdatePost

> NormalResponse updateServerMcpServerUpdatePost(mCPServerUpdateRequest, authorization, xForwardedFor)

Update Server

### Example

```ts
import {
  Configuration,
  McpApi,
} from '';
import type { UpdateServerMcpServerUpdatePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new McpApi();

  const body = {
    // MCPServerUpdateRequest
    mCPServerUpdateRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies UpdateServerMcpServerUpdatePostRequest;

  try {
    const data = await api.updateServerMcpServerUpdatePost(body);
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
| **mCPServerUpdateRequest** | [MCPServerUpdateRequest](MCPServerUpdateRequest.md) |  | |
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

