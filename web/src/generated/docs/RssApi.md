# RssApi

All URIs are relative to *http://localhost:8001/api/main-service*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**addRssServerRssAddPost**](RssApi.md#addrssserverrssaddpost) | **POST** /rss/add | Addrssserver |
| [**deleteRssServerRssDeletePost**](RssApi.md#deleterssserverrssdeletepost) | **POST** /rss/delete | Deleterssserver |
| [**getRssServerDetailRssDetailPost**](RssApi.md#getrssserverdetailrssdetailpost) | **POST** /rss/detail | Getrssserverdetail |
| [**getRssServerDocumentRssDocumentPost**](RssApi.md#getrssserverdocumentrssdocumentpost) | **POST** /rss/document | Getrssserverdocument |
| [**searchRssServerRssSearchPost**](RssApi.md#searchrssserverrsssearchpost) | **POST** /rss/search | Searchrssserver |
| [**updateRssServerRssUpdatePost**](RssApi.md#updaterssserverrssupdatepost) | **POST** /rss/update | Updaterssserver |



## addRssServerRssAddPost

> AddRssServerResponse addRssServerRssAddPost(addRssServerRequest, authorization, xForwardedFor)

Addrssserver

### Example

```ts
import {
  Configuration,
  RssApi,
} from '';
import type { AddRssServerRssAddPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new RssApi();

  const body = {
    // AddRssServerRequest
    addRssServerRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies AddRssServerRssAddPostRequest;

  try {
    const data = await api.addRssServerRssAddPost(body);
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
| **addRssServerRequest** | [AddRssServerRequest](AddRssServerRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xForwardedFor** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**AddRssServerResponse**](AddRssServerResponse.md)

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


## deleteRssServerRssDeletePost

> NormalResponse deleteRssServerRssDeletePost(deleteRssServerRequest, authorization, xForwardedFor)

Deleterssserver

### Example

```ts
import {
  Configuration,
  RssApi,
} from '';
import type { DeleteRssServerRssDeletePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new RssApi();

  const body = {
    // DeleteRssServerRequest
    deleteRssServerRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies DeleteRssServerRssDeletePostRequest;

  try {
    const data = await api.deleteRssServerRssDeletePost(body);
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
| **deleteRssServerRequest** | [DeleteRssServerRequest](DeleteRssServerRequest.md) |  | |
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


## getRssServerDetailRssDetailPost

> RssServerInfo getRssServerDetailRssDetailPost(getRssServerDetailRequest, authorization, xForwardedFor)

Getrssserverdetail

### Example

```ts
import {
  Configuration,
  RssApi,
} from '';
import type { GetRssServerDetailRssDetailPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new RssApi();

  const body = {
    // GetRssServerDetailRequest
    getRssServerDetailRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies GetRssServerDetailRssDetailPostRequest;

  try {
    const data = await api.getRssServerDetailRssDetailPost(body);
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
| **getRssServerDetailRequest** | [GetRssServerDetailRequest](GetRssServerDetailRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xForwardedFor** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**RssServerInfo**](RssServerInfo.md)

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


## getRssServerDocumentRssDocumentPost

> InifiniteScrollPagnitionDocumentInfo getRssServerDocumentRssDocumentPost(getRssServerDocumentRequest, authorization, xForwardedFor)

Getrssserverdocument

### Example

```ts
import {
  Configuration,
  RssApi,
} from '';
import type { GetRssServerDocumentRssDocumentPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new RssApi();

  const body = {
    // GetRssServerDocumentRequest
    getRssServerDocumentRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies GetRssServerDocumentRssDocumentPostRequest;

  try {
    const data = await api.getRssServerDocumentRssDocumentPost(body);
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
| **getRssServerDocumentRequest** | [GetRssServerDocumentRequest](GetRssServerDocumentRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xForwardedFor** | `string` |  | [Optional] [Defaults to `undefined`] |

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


## searchRssServerRssSearchPost

> InifiniteScrollPagnitionRssServerInfo searchRssServerRssSearchPost(searchRssServerRequest, authorization, xForwardedFor)

Searchrssserver

### Example

```ts
import {
  Configuration,
  RssApi,
} from '';
import type { SearchRssServerRssSearchPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new RssApi();

  const body = {
    // SearchRssServerRequest
    searchRssServerRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies SearchRssServerRssSearchPostRequest;

  try {
    const data = await api.searchRssServerRssSearchPost(body);
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
| **searchRssServerRequest** | [SearchRssServerRequest](SearchRssServerRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xForwardedFor** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**InifiniteScrollPagnitionRssServerInfo**](InifiniteScrollPagnitionRssServerInfo.md)

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


## updateRssServerRssUpdatePost

> NormalResponse updateRssServerRssUpdatePost(updateRssServerRequest, authorization, xForwardedFor)

Updaterssserver

### Example

```ts
import {
  Configuration,
  RssApi,
} from '';
import type { UpdateRssServerRssUpdatePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new RssApi();

  const body = {
    // UpdateRssServerRequest
    updateRssServerRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies UpdateRssServerRssUpdatePostRequest;

  try {
    const data = await api.updateRssServerRssUpdatePost(body);
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
| **updateRssServerRequest** | [UpdateRssServerRequest](UpdateRssServerRequest.md) |  | |
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

