# NotificationApi

All URIs are relative to *http://localhost:8001/api/main-service*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**addEmailSourceNotificationSourceAddPost**](NotificationApi.md#addemailsourcenotificationsourceaddpost) | **POST** /notification/source/add | Add Email Source |
| [**addNotificationTargetNotificationTargetAddPost**](NotificationApi.md#addnotificationtargetnotificationtargetaddpost) | **POST** /notification/target/add | Add Notification Target |
| [**addNotificationTaskNotificationTaskAddPost**](NotificationApi.md#addnotificationtasknotificationtaskaddpost) | **POST** /notification/task/add | Add Notification Task |
| [**deleteEmailSourceNotificationSourceDeletePost**](NotificationApi.md#deleteemailsourcenotificationsourcedeletepost) | **POST** /notification/source/delete | Delete Email Source |
| [**deleteNotificationRecordNotificationRecordDeletePost**](NotificationApi.md#deletenotificationrecordnotificationrecorddeletepost) | **POST** /notification/record/delete | Delete Notification Record |
| [**deleteNotificationTargetNotificationTargetDeletePost**](NotificationApi.md#deletenotificationtargetnotificationtargetdeletepost) | **POST** /notification/target/delete | Delete Notification Target |
| [**deleteNotificationTaskNotificationTaskDeletePost**](NotificationApi.md#deletenotificationtasknotificationtaskdeletepost) | **POST** /notification/task/delete | Delete Notification Task |
| [**getEmailSourceNotificationSourceMinePost**](NotificationApi.md#getemailsourcenotificationsourceminepost) | **POST** /notification/source/mine | Get Email Source |
| [**getMineNotificationTargetNotificationTargetMinePost**](NotificationApi.md#getminenotificationtargetnotificationtargetminepost) | **POST** /notification/target/mine | Get Mine Notification Target |
| [**getMineNotificationTaskNotificationTaskMinePost**](NotificationApi.md#getminenotificationtasknotificationtaskminepost) | **POST** /notification/task/mine | Get Mine Notification Task |
| [**getNotificationDetailNotificationSourceDetailPost**](NotificationApi.md#getnotificationdetailnotificationsourcedetailpost) | **POST** /notification/source/detail | Get Notification Detail |
| [**getNotificationRecordDetailNotificationRecordDetailPost**](NotificationApi.md#getnotificationrecorddetailnotificationrecorddetailpost) | **POST** /notification/record/detail | Get Notification Record Detail |
| [**getNotificationTargetDetailNotificationTargetDetailPost**](NotificationApi.md#getnotificationtargetdetailnotificationtargetdetailpost) | **POST** /notification/target/detail | Get Notification Target Detail |
| [**getNotificationTaskNotificationTaskDetailPost**](NotificationApi.md#getnotificationtasknotificationtaskdetailpost) | **POST** /notification/task/detail | Get Notification Task |
| [**getNotificationTemplatesNotificationTemplateAllPost**](NotificationApi.md#getnotificationtemplatesnotificationtemplateallpost) | **POST** /notification/template/all | Get Notification Templates |
| [**readAllNotificationRecordNotificationRecordReadAllPost**](NotificationApi.md#readallnotificationrecordnotificationrecordreadallpost) | **POST** /notification/record/read-all | Read All Notification Record |
| [**readNotificationRecordNotificationRecordReadPost**](NotificationApi.md#readnotificationrecordnotificationrecordreadpost) | **POST** /notification/record/read | Read Notification Record |
| [**searchNotificationRecordNotificationRecordSearchPost**](NotificationApi.md#searchnotificationrecordnotificationrecordsearchpost) | **POST** /notification/record/search | Search Notification Record |
| [**updateEmailSourceNotificationSourceUpdatePost**](NotificationApi.md#updateemailsourcenotificationsourceupdatepost) | **POST** /notification/source/update | Update Email Source |
| [**updateNotificationTargetNotificationTargetUpdatePost**](NotificationApi.md#updatenotificationtargetnotificationtargetupdatepost) | **POST** /notification/target/update | Update Notification Target |
| [**updateNotificationTaskNotificationTaskUpdatePost**](NotificationApi.md#updatenotificationtasknotificationtaskupdatepost) | **POST** /notification/task/update | Update Notification Task |



## addEmailSourceNotificationSourceAddPost

> NormalResponse addEmailSourceNotificationSourceAddPost(addNotificationSourceRequest, authorization, xForwardedFor)

Add Email Source

### Example

```ts
import {
  Configuration,
  NotificationApi,
} from '';
import type { AddEmailSourceNotificationSourceAddPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new NotificationApi();

  const body = {
    // AddNotificationSourceRequest
    addNotificationSourceRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies AddEmailSourceNotificationSourceAddPostRequest;

  try {
    const data = await api.addEmailSourceNotificationSourceAddPost(body);
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
| **addNotificationSourceRequest** | [AddNotificationSourceRequest](AddNotificationSourceRequest.md) |  | |
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


## addNotificationTargetNotificationTargetAddPost

> NormalResponse addNotificationTargetNotificationTargetAddPost(addNotificationTargetRequest, authorization, xForwardedFor)

Add Notification Target

### Example

```ts
import {
  Configuration,
  NotificationApi,
} from '';
import type { AddNotificationTargetNotificationTargetAddPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new NotificationApi();

  const body = {
    // AddNotificationTargetRequest
    addNotificationTargetRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies AddNotificationTargetNotificationTargetAddPostRequest;

  try {
    const data = await api.addNotificationTargetNotificationTargetAddPost(body);
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
| **addNotificationTargetRequest** | [AddNotificationTargetRequest](AddNotificationTargetRequest.md) |  | |
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


## addNotificationTaskNotificationTaskAddPost

> NormalResponse addNotificationTaskNotificationTaskAddPost(addNotificationTaskRequest, authorization, xForwardedFor)

Add Notification Task

### Example

```ts
import {
  Configuration,
  NotificationApi,
} from '';
import type { AddNotificationTaskNotificationTaskAddPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new NotificationApi();

  const body = {
    // AddNotificationTaskRequest
    addNotificationTaskRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies AddNotificationTaskNotificationTaskAddPostRequest;

  try {
    const data = await api.addNotificationTaskNotificationTaskAddPost(body);
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
| **addNotificationTaskRequest** | [AddNotificationTaskRequest](AddNotificationTaskRequest.md) |  | |
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


## deleteEmailSourceNotificationSourceDeletePost

> NormalResponse deleteEmailSourceNotificationSourceDeletePost(deleteNotificationSourceRequest, authorization, xForwardedFor)

Delete Email Source

### Example

```ts
import {
  Configuration,
  NotificationApi,
} from '';
import type { DeleteEmailSourceNotificationSourceDeletePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new NotificationApi();

  const body = {
    // DeleteNotificationSourceRequest
    deleteNotificationSourceRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies DeleteEmailSourceNotificationSourceDeletePostRequest;

  try {
    const data = await api.deleteEmailSourceNotificationSourceDeletePost(body);
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
| **deleteNotificationSourceRequest** | [DeleteNotificationSourceRequest](DeleteNotificationSourceRequest.md) |  | |
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


## deleteNotificationRecordNotificationRecordDeletePost

> NormalResponse deleteNotificationRecordNotificationRecordDeletePost(deleteNotificationRecordRequest, authorization, xForwardedFor)

Delete Notification Record

### Example

```ts
import {
  Configuration,
  NotificationApi,
} from '';
import type { DeleteNotificationRecordNotificationRecordDeletePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new NotificationApi();

  const body = {
    // DeleteNotificationRecordRequest
    deleteNotificationRecordRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies DeleteNotificationRecordNotificationRecordDeletePostRequest;

  try {
    const data = await api.deleteNotificationRecordNotificationRecordDeletePost(body);
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
| **deleteNotificationRecordRequest** | [DeleteNotificationRecordRequest](DeleteNotificationRecordRequest.md) |  | |
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


## deleteNotificationTargetNotificationTargetDeletePost

> NormalResponse deleteNotificationTargetNotificationTargetDeletePost(deleteNotificationTargetRequest, authorization, xForwardedFor)

Delete Notification Target

### Example

```ts
import {
  Configuration,
  NotificationApi,
} from '';
import type { DeleteNotificationTargetNotificationTargetDeletePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new NotificationApi();

  const body = {
    // DeleteNotificationTargetRequest
    deleteNotificationTargetRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies DeleteNotificationTargetNotificationTargetDeletePostRequest;

  try {
    const data = await api.deleteNotificationTargetNotificationTargetDeletePost(body);
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
| **deleteNotificationTargetRequest** | [DeleteNotificationTargetRequest](DeleteNotificationTargetRequest.md) |  | |
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


## deleteNotificationTaskNotificationTaskDeletePost

> NormalResponse deleteNotificationTaskNotificationTaskDeletePost(deleteNotificationTaskRequest, authorization, xForwardedFor)

Delete Notification Task

### Example

```ts
import {
  Configuration,
  NotificationApi,
} from '';
import type { DeleteNotificationTaskNotificationTaskDeletePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new NotificationApi();

  const body = {
    // DeleteNotificationTaskRequest
    deleteNotificationTaskRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies DeleteNotificationTaskNotificationTaskDeletePostRequest;

  try {
    const data = await api.deleteNotificationTaskNotificationTaskDeletePost(body);
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
| **deleteNotificationTaskRequest** | [DeleteNotificationTaskRequest](DeleteNotificationTaskRequest.md) |  | |
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


## getEmailSourceNotificationSourceMinePost

> NotificationSourcesResponse getEmailSourceNotificationSourceMinePost(authorization, xForwardedFor)

Get Email Source

### Example

```ts
import {
  Configuration,
  NotificationApi,
} from '';
import type { GetEmailSourceNotificationSourceMinePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new NotificationApi();

  const body = {
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies GetEmailSourceNotificationSourceMinePostRequest;

  try {
    const data = await api.getEmailSourceNotificationSourceMinePost(body);
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
| **xForwardedFor** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**NotificationSourcesResponse**](NotificationSourcesResponse.md)

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


## getMineNotificationTargetNotificationTargetMinePost

> NotificationTargetsResponse getMineNotificationTargetNotificationTargetMinePost(authorization, xForwardedFor)

Get Mine Notification Target

### Example

```ts
import {
  Configuration,
  NotificationApi,
} from '';
import type { GetMineNotificationTargetNotificationTargetMinePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new NotificationApi();

  const body = {
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies GetMineNotificationTargetNotificationTargetMinePostRequest;

  try {
    const data = await api.getMineNotificationTargetNotificationTargetMinePost(body);
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
| **xForwardedFor** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**NotificationTargetsResponse**](NotificationTargetsResponse.md)

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


## getMineNotificationTaskNotificationTaskMinePost

> NotificationTaskResponse getMineNotificationTaskNotificationTaskMinePost(authorization, xForwardedFor)

Get Mine Notification Task

### Example

```ts
import {
  Configuration,
  NotificationApi,
} from '';
import type { GetMineNotificationTaskNotificationTaskMinePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new NotificationApi();

  const body = {
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies GetMineNotificationTaskNotificationTaskMinePostRequest;

  try {
    const data = await api.getMineNotificationTaskNotificationTaskMinePost(body);
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
| **xForwardedFor** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**NotificationTaskResponse**](NotificationTaskResponse.md)

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


## getNotificationDetailNotificationSourceDetailPost

> NotificationSourceDetail getNotificationDetailNotificationSourceDetailPost(notificationSourceDetailRequest, authorization, xForwardedFor)

Get Notification Detail

### Example

```ts
import {
  Configuration,
  NotificationApi,
} from '';
import type { GetNotificationDetailNotificationSourceDetailPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new NotificationApi();

  const body = {
    // NotificationSourceDetailRequest
    notificationSourceDetailRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies GetNotificationDetailNotificationSourceDetailPostRequest;

  try {
    const data = await api.getNotificationDetailNotificationSourceDetailPost(body);
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
| **notificationSourceDetailRequest** | [NotificationSourceDetailRequest](NotificationSourceDetailRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xForwardedFor** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**NotificationSourceDetail**](NotificationSourceDetail.md)

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


## getNotificationRecordDetailNotificationRecordDetailPost

> NotificationRecord getNotificationRecordDetailNotificationRecordDetailPost(notificationRecordDetailRequest, authorization, xForwardedFor)

Get Notification Record Detail

### Example

```ts
import {
  Configuration,
  NotificationApi,
} from '';
import type { GetNotificationRecordDetailNotificationRecordDetailPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new NotificationApi();

  const body = {
    // NotificationRecordDetailRequest
    notificationRecordDetailRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies GetNotificationRecordDetailNotificationRecordDetailPostRequest;

  try {
    const data = await api.getNotificationRecordDetailNotificationRecordDetailPost(body);
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
| **notificationRecordDetailRequest** | [NotificationRecordDetailRequest](NotificationRecordDetailRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xForwardedFor** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**NotificationRecord**](NotificationRecord.md)

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


## getNotificationTargetDetailNotificationTargetDetailPost

> NotificationTargetDetail getNotificationTargetDetailNotificationTargetDetailPost(notificationTargetDetailRequest)

Get Notification Target Detail

### Example

```ts
import {
  Configuration,
  NotificationApi,
} from '';
import type { GetNotificationTargetDetailNotificationTargetDetailPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new NotificationApi();

  const body = {
    // NotificationTargetDetailRequest
    notificationTargetDetailRequest: ...,
  } satisfies GetNotificationTargetDetailNotificationTargetDetailPostRequest;

  try {
    const data = await api.getNotificationTargetDetailNotificationTargetDetailPost(body);
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
| **notificationTargetDetailRequest** | [NotificationTargetDetailRequest](NotificationTargetDetailRequest.md) |  | |

### Return type

[**NotificationTargetDetail**](NotificationTargetDetail.md)

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


## getNotificationTaskNotificationTaskDetailPost

> NotificationTask getNotificationTaskNotificationTaskDetailPost(notificationTaskDetailRequest, authorization, xForwardedFor)

Get Notification Task

### Example

```ts
import {
  Configuration,
  NotificationApi,
} from '';
import type { GetNotificationTaskNotificationTaskDetailPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new NotificationApi();

  const body = {
    // NotificationTaskDetailRequest
    notificationTaskDetailRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies GetNotificationTaskNotificationTaskDetailPostRequest;

  try {
    const data = await api.getNotificationTaskNotificationTaskDetailPost(body);
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
| **notificationTaskDetailRequest** | [NotificationTaskDetailRequest](NotificationTaskDetailRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xForwardedFor** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**NotificationTask**](NotificationTask.md)

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


## getNotificationTemplatesNotificationTemplateAllPost

> NotificationTemplatesResponse getNotificationTemplatesNotificationTemplateAllPost(authorization, xForwardedFor)

Get Notification Templates

### Example

```ts
import {
  Configuration,
  NotificationApi,
} from '';
import type { GetNotificationTemplatesNotificationTemplateAllPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new NotificationApi();

  const body = {
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies GetNotificationTemplatesNotificationTemplateAllPostRequest;

  try {
    const data = await api.getNotificationTemplatesNotificationTemplateAllPost(body);
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
| **xForwardedFor** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**NotificationTemplatesResponse**](NotificationTemplatesResponse.md)

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


## readAllNotificationRecordNotificationRecordReadAllPost

> NormalResponse readAllNotificationRecordNotificationRecordReadAllPost(authorization, xForwardedFor)

Read All Notification Record

### Example

```ts
import {
  Configuration,
  NotificationApi,
} from '';
import type { ReadAllNotificationRecordNotificationRecordReadAllPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new NotificationApi();

  const body = {
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies ReadAllNotificationRecordNotificationRecordReadAllPostRequest;

  try {
    const data = await api.readAllNotificationRecordNotificationRecordReadAllPost(body);
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
| **xForwardedFor** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**NormalResponse**](NormalResponse.md)

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


## readNotificationRecordNotificationRecordReadPost

> NormalResponse readNotificationRecordNotificationRecordReadPost(readNotificationRecordRequest, authorization, xForwardedFor)

Read Notification Record

### Example

```ts
import {
  Configuration,
  NotificationApi,
} from '';
import type { ReadNotificationRecordNotificationRecordReadPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new NotificationApi();

  const body = {
    // ReadNotificationRecordRequest
    readNotificationRecordRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies ReadNotificationRecordNotificationRecordReadPostRequest;

  try {
    const data = await api.readNotificationRecordNotificationRecordReadPost(body);
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
| **readNotificationRecordRequest** | [ReadNotificationRecordRequest](ReadNotificationRecordRequest.md) |  | |
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


## searchNotificationRecordNotificationRecordSearchPost

> InifiniteScrollPagnitionNotificationRecord searchNotificationRecordNotificationRecordSearchPost(searchNotificationRecordRequest, authorization, xForwardedFor)

Search Notification Record

### Example

```ts
import {
  Configuration,
  NotificationApi,
} from '';
import type { SearchNotificationRecordNotificationRecordSearchPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new NotificationApi();

  const body = {
    // SearchNotificationRecordRequest
    searchNotificationRecordRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies SearchNotificationRecordNotificationRecordSearchPostRequest;

  try {
    const data = await api.searchNotificationRecordNotificationRecordSearchPost(body);
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
| **searchNotificationRecordRequest** | [SearchNotificationRecordRequest](SearchNotificationRecordRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xForwardedFor** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**InifiniteScrollPagnitionNotificationRecord**](InifiniteScrollPagnitionNotificationRecord.md)

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


## updateEmailSourceNotificationSourceUpdatePost

> NormalResponse updateEmailSourceNotificationSourceUpdatePost(updateNotificationSourceRequest, authorization, xForwardedFor)

Update Email Source

### Example

```ts
import {
  Configuration,
  NotificationApi,
} from '';
import type { UpdateEmailSourceNotificationSourceUpdatePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new NotificationApi();

  const body = {
    // UpdateNotificationSourceRequest
    updateNotificationSourceRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies UpdateEmailSourceNotificationSourceUpdatePostRequest;

  try {
    const data = await api.updateEmailSourceNotificationSourceUpdatePost(body);
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
| **updateNotificationSourceRequest** | [UpdateNotificationSourceRequest](UpdateNotificationSourceRequest.md) |  | |
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


## updateNotificationTargetNotificationTargetUpdatePost

> NormalResponse updateNotificationTargetNotificationTargetUpdatePost(updateNotificationTargetRequest, authorization, xForwardedFor)

Update Notification Target

### Example

```ts
import {
  Configuration,
  NotificationApi,
} from '';
import type { UpdateNotificationTargetNotificationTargetUpdatePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new NotificationApi();

  const body = {
    // UpdateNotificationTargetRequest
    updateNotificationTargetRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies UpdateNotificationTargetNotificationTargetUpdatePostRequest;

  try {
    const data = await api.updateNotificationTargetNotificationTargetUpdatePost(body);
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
| **updateNotificationTargetRequest** | [UpdateNotificationTargetRequest](UpdateNotificationTargetRequest.md) |  | |
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


## updateNotificationTaskNotificationTaskUpdatePost

> NormalResponse updateNotificationTaskNotificationTaskUpdatePost(updateNotificationTaskRequest, authorization, xForwardedFor)

Update Notification Task

### Example

```ts
import {
  Configuration,
  NotificationApi,
} from '';
import type { UpdateNotificationTaskNotificationTaskUpdatePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new NotificationApi();

  const body = {
    // UpdateNotificationTaskRequest
    updateNotificationTaskRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies UpdateNotificationTaskNotificationTaskUpdatePostRequest;

  try {
    const data = await api.updateNotificationTaskNotificationTaskUpdatePost(body);
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
| **updateNotificationTaskRequest** | [UpdateNotificationTaskRequest](UpdateNotificationTaskRequest.md) |  | |
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

