# AccessRequestApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**cancelAccessRequestAccessRequestCancelPost**](AccessRequestApi.md#cancelaccessrequestaccessrequestcancelpost) | **POST** /access-request/cancel | Cancel Access Request |
| [**createAccessRequestAccessRequestCreatePost**](AccessRequestApi.md#createaccessrequestaccessrequestcreatepost) | **POST** /access-request/create | Create Access Request |
| [**getMyAccessRequestAccessRequestMinePost**](AccessRequestApi.md#getmyaccessrequestaccessrequestminepost) | **POST** /access-request/mine | Get My Access Request |
| [**handleAccessRequestAccessRequestHandlePost**](AccessRequestApi.md#handleaccessrequestaccessrequesthandlepost) | **POST** /access-request/handle | Handle Access Request |
| [**listAccessRequestsAccessRequestListPost**](AccessRequestApi.md#listaccessrequestsaccessrequestlistpost) | **POST** /access-request/list | List Access Requests |



## cancelAccessRequestAccessRequestCancelPost

> NormalResponse cancelAccessRequestAccessRequestCancelPost(accessRequestCancelRequest, authorization, xUserTimezone)

Cancel Access Request

### Example

```ts
import {
  Configuration,
  AccessRequestApi,
} from '';
import type { CancelAccessRequestAccessRequestCancelPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AccessRequestApi();

  const body = {
    // AccessRequestCancelRequest
    accessRequestCancelRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies CancelAccessRequestAccessRequestCancelPostRequest;

  try {
    const data = await api.cancelAccessRequestAccessRequestCancelPost(body);
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
| **accessRequestCancelRequest** | [AccessRequestCancelRequest](AccessRequestCancelRequest.md) |  | |
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


## createAccessRequestAccessRequestCreatePost

> AccessRequestInfo createAccessRequestAccessRequestCreatePost(accessRequestCreateRequest, authorization, xUserTimezone)

Create Access Request

### Example

```ts
import {
  Configuration,
  AccessRequestApi,
} from '';
import type { CreateAccessRequestAccessRequestCreatePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AccessRequestApi();

  const body = {
    // AccessRequestCreateRequest
    accessRequestCreateRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies CreateAccessRequestAccessRequestCreatePostRequest;

  try {
    const data = await api.createAccessRequestAccessRequestCreatePost(body);
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
| **accessRequestCreateRequest** | [AccessRequestCreateRequest](AccessRequestCreateRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**AccessRequestInfo**](AccessRequestInfo.md)

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


## getMyAccessRequestAccessRequestMinePost

> AccessRequestMineResponse getMyAccessRequestAccessRequestMinePost(accessRequestMineRequest, authorization, xUserTimezone)

Get My Access Request

### Example

```ts
import {
  Configuration,
  AccessRequestApi,
} from '';
import type { GetMyAccessRequestAccessRequestMinePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AccessRequestApi();

  const body = {
    // AccessRequestMineRequest
    accessRequestMineRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies GetMyAccessRequestAccessRequestMinePostRequest;

  try {
    const data = await api.getMyAccessRequestAccessRequestMinePost(body);
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
| **accessRequestMineRequest** | [AccessRequestMineRequest](AccessRequestMineRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**AccessRequestMineResponse**](AccessRequestMineResponse.md)

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


## handleAccessRequestAccessRequestHandlePost

> AccessRequestInfo handleAccessRequestAccessRequestHandlePost(accessRequestHandleRequest, authorization, xUserTimezone)

Handle Access Request

### Example

```ts
import {
  Configuration,
  AccessRequestApi,
} from '';
import type { HandleAccessRequestAccessRequestHandlePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AccessRequestApi();

  const body = {
    // AccessRequestHandleRequest
    accessRequestHandleRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies HandleAccessRequestAccessRequestHandlePostRequest;

  try {
    const data = await api.handleAccessRequestAccessRequestHandlePost(body);
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
| **accessRequestHandleRequest** | [AccessRequestHandleRequest](AccessRequestHandleRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**AccessRequestInfo**](AccessRequestInfo.md)

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


## listAccessRequestsAccessRequestListPost

> AccessRequestListResponse listAccessRequestsAccessRequestListPost(accessRequestListRequest, authorization, xUserTimezone)

List Access Requests

### Example

```ts
import {
  Configuration,
  AccessRequestApi,
} from '';
import type { ListAccessRequestsAccessRequestListPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AccessRequestApi();

  const body = {
    // AccessRequestListRequest
    accessRequestListRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies ListAccessRequestsAccessRequestListPostRequest;

  try {
    const data = await api.listAccessRequestsAccessRequestListPost(body);
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
| **accessRequestListRequest** | [AccessRequestListRequest](AccessRequestListRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**AccessRequestListResponse**](AccessRequestListResponse.md)

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

