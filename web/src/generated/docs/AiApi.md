# AiApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**askAiAiAskPost**](AiApi.md#askaiaiaskpost) | **POST** /ai/ask | Ask Ai |
| [**createModelAiModelCreatePost**](AiApi.md#createmodelaimodelcreatepost) | **POST** /ai/model/create | Create Model |
| [**createModelProviderAiModelProviderCreatePost**](AiApi.md#createmodelprovideraimodelprovidercreatepost) | **POST** /ai/model-provider/create | Create Model Provider |
| [**deleteAiModelAiModelDeletePost**](AiApi.md#deleteaimodelaimodeldeletepost) | **POST** /ai/model/delete | Delete Ai Model |
| [**deleteAiModelProviderAiModelProviderDeletePost**](AiApi.md#deleteaimodelprovideraimodelproviderdeletepost) | **POST** /ai/model-provider/delete | Delete Ai Model Provider |
| [**forkAiModelProviderAiModelProviderForkPost**](AiApi.md#forkaimodelprovideraimodelproviderforkpost) | **POST** /ai/model-provider/fork | Fork Ai Model Provider |
| [**getAiModelAiModelDetailPost**](AiApi.md#getaimodelaimodeldetailpost) | **POST** /ai/model/detail | Get Ai Model |
| [**getAiModelProviderAiModelProviderDetailPost**](AiApi.md#getaimodelprovideraimodelproviderdetailpost) | **POST** /ai/model-provider/detail | Get Ai Model Provider |
| [**inspectModelBillingAuditAiModelBillingAuditPost**](AiApi.md#inspectmodelbillingauditaimodelbillingauditpost) | **POST** /ai/model/billing-audit | Inspect Model Billing Audit |
| [**listAiModelAiModelSearchPost**](AiApi.md#listaimodelaimodelsearchpost) | **POST** /ai/model/search | List Ai Model |
| [**listAiModelProviderAiModelProviderCommunityPost**](AiApi.md#listaimodelprovideraimodelprovidercommunitypost) | **POST** /ai/model-provider/community | List Ai Model Provider |
| [**updateAiModelAiModelUpdatePost**](AiApi.md#updateaimodelaimodelupdatepost) | **POST** /ai/model/update | Update Ai Model |
| [**updateAiModelProviderAiModelProviderUpdatePost**](AiApi.md#updateaimodelprovideraimodelproviderupdatepost) | **POST** /ai/model-provider/update | Update Ai Model Provider |



## askAiAiAskPost

> any askAiAiAskPost(chatMessages, authorization, xUserTimezone)

Ask Ai

Handle Revornix AI chat requests with optional MCP tool usage.

### Example

```ts
import {
  Configuration,
  AiApi,
} from '';
import type { AskAiAiAskPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AiApi();

  const body = {
    // ChatMessages
    chatMessages: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies AskAiAiAskPostRequest;

  try {
    const data = await api.askAiAiAskPost(body);
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
| **chatMessages** | [ChatMessages](ChatMessages.md) |  | |
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


## createModelAiModelCreatePost

> ModelCreateResponse createModelAiModelCreatePost(modelCreateRequest, authorization, xUserTimezone)

Create Model

### Example

```ts
import {
  Configuration,
  AiApi,
} from '';
import type { CreateModelAiModelCreatePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AiApi();

  const body = {
    // ModelCreateRequest
    modelCreateRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies CreateModelAiModelCreatePostRequest;

  try {
    const data = await api.createModelAiModelCreatePost(body);
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
| **modelCreateRequest** | [ModelCreateRequest](ModelCreateRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**ModelCreateResponse**](ModelCreateResponse.md)

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


## createModelProviderAiModelProviderCreatePost

> ModelProviderCreateResponse createModelProviderAiModelProviderCreatePost(modelProviderCreateRequest, authorization, xUserTimezone)

Create Model Provider

### Example

```ts
import {
  Configuration,
  AiApi,
} from '';
import type { CreateModelProviderAiModelProviderCreatePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AiApi();

  const body = {
    // ModelProviderCreateRequest
    modelProviderCreateRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies CreateModelProviderAiModelProviderCreatePostRequest;

  try {
    const data = await api.createModelProviderAiModelProviderCreatePost(body);
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
| **modelProviderCreateRequest** | [ModelProviderCreateRequest](ModelProviderCreateRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**ModelProviderCreateResponse**](ModelProviderCreateResponse.md)

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


## deleteAiModelAiModelDeletePost

> NormalResponse deleteAiModelAiModelDeletePost(deleteModelRequest, authorization, xUserTimezone)

Delete Ai Model

### Example

```ts
import {
  Configuration,
  AiApi,
} from '';
import type { DeleteAiModelAiModelDeletePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AiApi();

  const body = {
    // DeleteModelRequest
    deleteModelRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies DeleteAiModelAiModelDeletePostRequest;

  try {
    const data = await api.deleteAiModelAiModelDeletePost(body);
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
| **deleteModelRequest** | [DeleteModelRequest](DeleteModelRequest.md) |  | |
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


## deleteAiModelProviderAiModelProviderDeletePost

> NormalResponse deleteAiModelProviderAiModelProviderDeletePost(deleteModelProviderRequest, authorization, xUserTimezone)

Delete Ai Model Provider

### Example

```ts
import {
  Configuration,
  AiApi,
} from '';
import type { DeleteAiModelProviderAiModelProviderDeletePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AiApi();

  const body = {
    // DeleteModelProviderRequest
    deleteModelProviderRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies DeleteAiModelProviderAiModelProviderDeletePostRequest;

  try {
    const data = await api.deleteAiModelProviderAiModelProviderDeletePost(body);
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
| **deleteModelProviderRequest** | [DeleteModelProviderRequest](DeleteModelProviderRequest.md) |  | |
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


## forkAiModelProviderAiModelProviderForkPost

> NormalResponse forkAiModelProviderAiModelProviderForkPost(modelProviderForkRequest, authorization, xUserTimezone)

Fork Ai Model Provider

### Example

```ts
import {
  Configuration,
  AiApi,
} from '';
import type { ForkAiModelProviderAiModelProviderForkPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AiApi();

  const body = {
    // ModelProviderForkRequest
    modelProviderForkRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies ForkAiModelProviderAiModelProviderForkPostRequest;

  try {
    const data = await api.forkAiModelProviderAiModelProviderForkPost(body);
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
| **modelProviderForkRequest** | [ModelProviderForkRequest](ModelProviderForkRequest.md) |  | |
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


## getAiModelAiModelDetailPost

> Model getAiModelAiModelDetailPost(modelRequest, authorization, xUserTimezone)

Get Ai Model

### Example

```ts
import {
  Configuration,
  AiApi,
} from '';
import type { GetAiModelAiModelDetailPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AiApi();

  const body = {
    // ModelRequest
    modelRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies GetAiModelAiModelDetailPostRequest;

  try {
    const data = await api.getAiModelAiModelDetailPost(body);
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
| **modelRequest** | [ModelRequest](ModelRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**Model**](Model.md)

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


## getAiModelProviderAiModelProviderDetailPost

> ModelProviderDetail getAiModelProviderAiModelProviderDetailPost(modelProviderRequest, authorization, xUserTimezone)

Get Ai Model Provider

### Example

```ts
import {
  Configuration,
  AiApi,
} from '';
import type { GetAiModelProviderAiModelProviderDetailPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AiApi();

  const body = {
    // ModelProviderRequest
    modelProviderRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies GetAiModelProviderAiModelProviderDetailPostRequest;

  try {
    const data = await api.getAiModelProviderAiModelProviderDetailPost(body);
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
| **modelProviderRequest** | [ModelProviderRequest](ModelProviderRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**ModelProviderDetail**](ModelProviderDetail.md)

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


## inspectModelBillingAuditAiModelBillingAuditPost

> BillingAuditResponse inspectModelBillingAuditAiModelBillingAuditPost(authorization, xUserTimezone)

Inspect Model Billing Audit

### Example

```ts
import {
  Configuration,
  AiApi,
} from '';
import type { InspectModelBillingAuditAiModelBillingAuditPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AiApi();

  const body = {
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies InspectModelBillingAuditAiModelBillingAuditPostRequest;

  try {
    const data = await api.inspectModelBillingAuditAiModelBillingAuditPost(body);
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

[**BillingAuditResponse**](BillingAuditResponse.md)

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


## listAiModelAiModelSearchPost

> ModelSearchResponse listAiModelAiModelSearchPost(modelSearchRequest, authorization, xUserTimezone)

List Ai Model

### Example

```ts
import {
  Configuration,
  AiApi,
} from '';
import type { ListAiModelAiModelSearchPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AiApi();

  const body = {
    // ModelSearchRequest
    modelSearchRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies ListAiModelAiModelSearchPostRequest;

  try {
    const data = await api.listAiModelAiModelSearchPost(body);
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
| **modelSearchRequest** | [ModelSearchRequest](ModelSearchRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**ModelSearchResponse**](ModelSearchResponse.md)

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


## listAiModelProviderAiModelProviderCommunityPost

> InifiniteScrollPagnitionModelProvider listAiModelProviderAiModelProviderCommunityPost(modelProviderSearchRequest, authorization, xUserTimezone)

List Ai Model Provider

搜索当前所有我可以使用的模型供应商 包含我创建的和公开的

### Example

```ts
import {
  Configuration,
  AiApi,
} from '';
import type { ListAiModelProviderAiModelProviderCommunityPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AiApi();

  const body = {
    // ModelProviderSearchRequest
    modelProviderSearchRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies ListAiModelProviderAiModelProviderCommunityPostRequest;

  try {
    const data = await api.listAiModelProviderAiModelProviderCommunityPost(body);
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
| **modelProviderSearchRequest** | [ModelProviderSearchRequest](ModelProviderSearchRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**InifiniteScrollPagnitionModelProvider**](InifiniteScrollPagnitionModelProvider.md)

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


## updateAiModelAiModelUpdatePost

> NormalResponse updateAiModelAiModelUpdatePost(modelUpdateRequest, authorization, xUserTimezone)

Update Ai Model

### Example

```ts
import {
  Configuration,
  AiApi,
} from '';
import type { UpdateAiModelAiModelUpdatePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AiApi();

  const body = {
    // ModelUpdateRequest
    modelUpdateRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies UpdateAiModelAiModelUpdatePostRequest;

  try {
    const data = await api.updateAiModelAiModelUpdatePost(body);
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
| **modelUpdateRequest** | [ModelUpdateRequest](ModelUpdateRequest.md) |  | |
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


## updateAiModelProviderAiModelProviderUpdatePost

> NormalResponse updateAiModelProviderAiModelProviderUpdatePost(modelProviderUpdateRequest, authorization, xUserTimezone)

Update Ai Model Provider

### Example

```ts
import {
  Configuration,
  AiApi,
} from '';
import type { UpdateAiModelProviderAiModelProviderUpdatePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AiApi();

  const body = {
    // ModelProviderUpdateRequest
    modelProviderUpdateRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies UpdateAiModelProviderAiModelProviderUpdatePostRequest;

  try {
    const data = await api.updateAiModelProviderAiModelProviderUpdatePost(body);
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
| **modelProviderUpdateRequest** | [ModelProviderUpdateRequest](ModelProviderUpdateRequest.md) |  | |
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

