# AgentApi

All URIs are relative to *http://localhost*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**approveConfirmationAgentConfirmationsConfirmationIdApprovePost**](AgentApi.md#approveconfirmationagentconfirmationsconfirmationidapprovepost) | **POST** /agent/confirmations/{confirmation_id}/approve | Approve Confirmation |
| [**cancelQueuedMessageAgentSessionQueueCancelPost**](AgentApi.md#cancelqueuedmessageagentsessionqueuecancelpost) | **POST** /agent/session/queue/cancel | Cancel Queued Message |
| [**compactAgentSessionAgentSessionCompactPost**](AgentApi.md#compactagentsessionagentsessioncompactpost) | **POST** /agent/session/compact | Compact Agent Session |
| [**createAgentSessionAgentSessionCreatePost**](AgentApi.md#createagentsessionagentsessioncreatepost) | **POST** /agent/session/create | Create Agent Session |
| [**deleteAgentSessionAgentSessionDeletePost**](AgentApi.md#deleteagentsessionagentsessiondeletepost) | **POST** /agent/session/delete | Delete Agent Session |
| [**getAgentSessionAgentSessionDetailPost**](AgentApi.md#getagentsessionagentsessiondetailpost) | **POST** /agent/session/detail | Get Agent Session |
| [**getConfirmationAgentConfirmationsConfirmationIdGet**](AgentApi.md#getconfirmationagentconfirmationsconfirmationidget) | **GET** /agent/confirmations/{confirmation_id} | Get Confirmation |
| [**invokeAgentToolAgentToolsNamePost**](AgentApi.md#invokeagenttoolagenttoolsnamepost) | **POST** /agent/tools/{name} | Invoke Agent Tool |
| [**listAgentMessagesAgentSessionMessagesPost**](AgentApi.md#listagentmessagesagentsessionmessagespost) | **POST** /agent/session/messages | List Agent Messages |
| [**listAgentToolsAgentToolsGet**](AgentApi.md#listagenttoolsagenttoolsget) | **GET** /agent/tools | List Agent Tools |
| [**listConfirmationsAgentConfirmationsListPost**](AgentApi.md#listconfirmationsagentconfirmationslistpost) | **POST** /agent/confirmations/list | List Confirmations |
| [**listQueuedMessagesAgentSessionQueuePost**](AgentApi.md#listqueuedmessagesagentsessionqueuepost) | **POST** /agent/session/queue | List Queued Messages |
| [**postAgentMessageAgentSessionMessagePost**](AgentApi.md#postagentmessageagentsessionmessagepost) | **POST** /agent/session/message | Post Agent Message |
| [**rejectConfirmationAgentConfirmationsConfirmationIdRejectPost**](AgentApi.md#rejectconfirmationagentconfirmationsconfirmationidrejectpost) | **POST** /agent/confirmations/{confirmation_id}/reject | Reject Confirmation |
| [**searchAgentSessionsAgentSessionSearchPost**](AgentApi.md#searchagentsessionsagentsessionsearchpost) | **POST** /agent/session/search | Search Agent Sessions |
| [**steerQueuedMessageAgentSessionQueueSteerPost**](AgentApi.md#steerqueuedmessageagentsessionqueuesteerpost) | **POST** /agent/session/queue/steer | Steer Queued Message |
| [**stopAgentTurnAgentSessionStopPost**](AgentApi.md#stopagentturnagentsessionstoppost) | **POST** /agent/session/stop | Stop Agent Turn |
| [**streamAgentTurnAgentSessionSessionIdStreamGet**](AgentApi.md#streamagentturnagentsessionsessionidstreamget) | **GET** /agent/session/{session_id}/stream | Stream Agent Turn |
| [**updateAgentSessionAgentSessionUpdatePost**](AgentApi.md#updateagentsessionagentsessionupdatepost) | **POST** /agent/session/update | Update Agent Session |



## approveConfirmationAgentConfirmationsConfirmationIdApprovePost

> ToolConfirmationInfo approveConfirmationAgentConfirmationsConfirmationIdApprovePost(confirmationId, authorization, xUserTimezone)

Approve Confirmation

### Example

```ts
import {
  Configuration,
  AgentApi,
} from '';
import type { ApproveConfirmationAgentConfirmationsConfirmationIdApprovePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AgentApi();

  const body = {
    // number
    confirmationId: 56,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies ApproveConfirmationAgentConfirmationsConfirmationIdApprovePostRequest;

  try {
    const data = await api.approveConfirmationAgentConfirmationsConfirmationIdApprovePost(body);
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
| **confirmationId** | `number` |  | [Defaults to `undefined`] |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**ToolConfirmationInfo**](ToolConfirmationInfo.md)

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


## cancelQueuedMessageAgentSessionQueueCancelPost

> { [key: string]: any; } cancelQueuedMessageAgentSessionQueueCancelPost(sessionId, messageId, authorization, xUserTimezone)

Cancel Queued Message

### Example

```ts
import {
  Configuration,
  AgentApi,
} from '';
import type { CancelQueuedMessageAgentSessionQueueCancelPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AgentApi();

  const body = {
    // number
    sessionId: 56,
    // number
    messageId: 56,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies CancelQueuedMessageAgentSessionQueueCancelPostRequest;

  try {
    const data = await api.cancelQueuedMessageAgentSessionQueueCancelPost(body);
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
| **sessionId** | `number` |  | [Defaults to `undefined`] |
| **messageId** | `number` |  | [Defaults to `undefined`] |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

**{ [key: string]: any; }**

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


## compactAgentSessionAgentSessionCompactPost

> AgentCompactResponse compactAgentSessionAgentSessionCompactPost(agentSessionIdRequest, authorization, xUserTimezone)

Compact Agent Session

手动整理上下文。压缩要调一次模型做摘要,所以是用户主动触发,不做后台自动跑。

### Example

```ts
import {
  Configuration,
  AgentApi,
} from '';
import type { CompactAgentSessionAgentSessionCompactPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AgentApi();

  const body = {
    // AgentSessionIdRequest
    agentSessionIdRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies CompactAgentSessionAgentSessionCompactPostRequest;

  try {
    const data = await api.compactAgentSessionAgentSessionCompactPost(body);
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
| **agentSessionIdRequest** | [AgentSessionIdRequest](AgentSessionIdRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**AgentCompactResponse**](AgentCompactResponse.md)

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


## createAgentSessionAgentSessionCreatePost

> AgentSessionInfo createAgentSessionAgentSessionCreatePost(agentSessionCreateRequest, authorization, xUserTimezone)

Create Agent Session

### Example

```ts
import {
  Configuration,
  AgentApi,
} from '';
import type { CreateAgentSessionAgentSessionCreatePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AgentApi();

  const body = {
    // AgentSessionCreateRequest
    agentSessionCreateRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies CreateAgentSessionAgentSessionCreatePostRequest;

  try {
    const data = await api.createAgentSessionAgentSessionCreatePost(body);
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
| **agentSessionCreateRequest** | [AgentSessionCreateRequest](AgentSessionCreateRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**AgentSessionInfo**](AgentSessionInfo.md)

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


## deleteAgentSessionAgentSessionDeletePost

> SuccessResponse deleteAgentSessionAgentSessionDeletePost(agentSessionIdRequest, authorization, xUserTimezone)

Delete Agent Session

### Example

```ts
import {
  Configuration,
  AgentApi,
} from '';
import type { DeleteAgentSessionAgentSessionDeletePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AgentApi();

  const body = {
    // AgentSessionIdRequest
    agentSessionIdRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies DeleteAgentSessionAgentSessionDeletePostRequest;

  try {
    const data = await api.deleteAgentSessionAgentSessionDeletePost(body);
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
| **agentSessionIdRequest** | [AgentSessionIdRequest](AgentSessionIdRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**SuccessResponse**](SuccessResponse.md)

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


## getAgentSessionAgentSessionDetailPost

> AgentSessionInfo getAgentSessionAgentSessionDetailPost(agentSessionIdRequest, authorization, xUserTimezone)

Get Agent Session

### Example

```ts
import {
  Configuration,
  AgentApi,
} from '';
import type { GetAgentSessionAgentSessionDetailPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AgentApi();

  const body = {
    // AgentSessionIdRequest
    agentSessionIdRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies GetAgentSessionAgentSessionDetailPostRequest;

  try {
    const data = await api.getAgentSessionAgentSessionDetailPost(body);
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
| **agentSessionIdRequest** | [AgentSessionIdRequest](AgentSessionIdRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**AgentSessionInfo**](AgentSessionInfo.md)

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


## getConfirmationAgentConfirmationsConfirmationIdGet

> ToolConfirmationInfo getConfirmationAgentConfirmationsConfirmationIdGet(confirmationId, authorization, xUserTimezone)

Get Confirmation

sidecar 阻塞轮询的端点,也是前端卡片的轮询端点。

### Example

```ts
import {
  Configuration,
  AgentApi,
} from '';
import type { GetConfirmationAgentConfirmationsConfirmationIdGetRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AgentApi();

  const body = {
    // number
    confirmationId: 56,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies GetConfirmationAgentConfirmationsConfirmationIdGetRequest;

  try {
    const data = await api.getConfirmationAgentConfirmationsConfirmationIdGet(body);
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
| **confirmationId** | `number` |  | [Defaults to `undefined`] |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**ToolConfirmationInfo**](ToolConfirmationInfo.md)

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


## invokeAgentToolAgentToolsNamePost

> { [key: string]: any; } invokeAgentToolAgentToolsNamePost(name, agentToolInvokeRequest, authorization, xUserTimezone)

Invoke Agent Tool

以调用方的身份执行一个工具。  确认门控的工具在这里分流:命中「本会话始终允许」/ bypass 模式的直接执行; 否则只建一张 pending 卡,sidecar 会阻塞轮询它的结果。

### Example

```ts
import {
  Configuration,
  AgentApi,
} from '';
import type { InvokeAgentToolAgentToolsNamePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AgentApi();

  const body = {
    // string
    name: name_example,
    // AgentToolInvokeRequest
    agentToolInvokeRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies InvokeAgentToolAgentToolsNamePostRequest;

  try {
    const data = await api.invokeAgentToolAgentToolsNamePost(body);
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
| **name** | `string` |  | [Defaults to `undefined`] |
| **agentToolInvokeRequest** | [AgentToolInvokeRequest](AgentToolInvokeRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

**{ [key: string]: any; }**

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


## listAgentMessagesAgentSessionMessagesPost

> Array&lt;AgentMessageInfo&gt; listAgentMessagesAgentSessionMessagesPost(agentSessionIdRequest, authorization, xUserTimezone)

List Agent Messages

### Example

```ts
import {
  Configuration,
  AgentApi,
} from '';
import type { ListAgentMessagesAgentSessionMessagesPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AgentApi();

  const body = {
    // AgentSessionIdRequest
    agentSessionIdRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies ListAgentMessagesAgentSessionMessagesPostRequest;

  try {
    const data = await api.listAgentMessagesAgentSessionMessagesPost(body);
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
| **agentSessionIdRequest** | [AgentSessionIdRequest](AgentSessionIdRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**Array&lt;AgentMessageInfo&gt;**](AgentMessageInfo.md)

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


## listAgentToolsAgentToolsGet

> Array&lt;AgentToolSpecInfo&gt; listAgentToolsAgentToolsGet(authorization, xUserTimezone)

List Agent Tools

智能体工具清单。从 mcp_router 的注册表派生,永远只有这一份。

### Example

```ts
import {
  Configuration,
  AgentApi,
} from '';
import type { ListAgentToolsAgentToolsGetRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AgentApi();

  const body = {
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies ListAgentToolsAgentToolsGetRequest;

  try {
    const data = await api.listAgentToolsAgentToolsGet(body);
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

[**Array&lt;AgentToolSpecInfo&gt;**](AgentToolSpecInfo.md)

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


## listConfirmationsAgentConfirmationsListPost

> Array&lt;ToolConfirmationInfo&gt; listConfirmationsAgentConfirmationsListPost(confirmationSearchRequest, authorization, xUserTimezone)

List Confirmations

### Example

```ts
import {
  Configuration,
  AgentApi,
} from '';
import type { ListConfirmationsAgentConfirmationsListPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AgentApi();

  const body = {
    // ConfirmationSearchRequest
    confirmationSearchRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies ListConfirmationsAgentConfirmationsListPostRequest;

  try {
    const data = await api.listConfirmationsAgentConfirmationsListPost(body);
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
| **confirmationSearchRequest** | [ConfirmationSearchRequest](ConfirmationSearchRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**Array&lt;ToolConfirmationInfo&gt;**](ToolConfirmationInfo.md)

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


## listQueuedMessagesAgentSessionQueuePost

> Array&lt;AgentMessageInfo&gt; listQueuedMessagesAgentSessionQueuePost(agentSessionIdRequest, authorization, xUserTimezone)

List Queued Messages

### Example

```ts
import {
  Configuration,
  AgentApi,
} from '';
import type { ListQueuedMessagesAgentSessionQueuePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AgentApi();

  const body = {
    // AgentSessionIdRequest
    agentSessionIdRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies ListQueuedMessagesAgentSessionQueuePostRequest;

  try {
    const data = await api.listQueuedMessagesAgentSessionQueuePost(body);
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
| **agentSessionIdRequest** | [AgentSessionIdRequest](AgentSessionIdRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**Array&lt;AgentMessageInfo&gt;**](AgentMessageInfo.md)

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


## postAgentMessageAgentSessionMessagePost

> AgentMessageInfo postAgentMessageAgentSessionMessagePost(sessionId, agentMessageCreateRequest, authorization, xUserTimezone)

Post Agent Message

### Example

```ts
import {
  Configuration,
  AgentApi,
} from '';
import type { PostAgentMessageAgentSessionMessagePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AgentApi();

  const body = {
    // number
    sessionId: 56,
    // AgentMessageCreateRequest
    agentMessageCreateRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies PostAgentMessageAgentSessionMessagePostRequest;

  try {
    const data = await api.postAgentMessageAgentSessionMessagePost(body);
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
| **sessionId** | `number` |  | [Defaults to `undefined`] |
| **agentMessageCreateRequest** | [AgentMessageCreateRequest](AgentMessageCreateRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**AgentMessageInfo**](AgentMessageInfo.md)

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


## rejectConfirmationAgentConfirmationsConfirmationIdRejectPost

> ToolConfirmationInfo rejectConfirmationAgentConfirmationsConfirmationIdRejectPost(confirmationId, authorization, xUserTimezone)

Reject Confirmation

### Example

```ts
import {
  Configuration,
  AgentApi,
} from '';
import type { RejectConfirmationAgentConfirmationsConfirmationIdRejectPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AgentApi();

  const body = {
    // number
    confirmationId: 56,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies RejectConfirmationAgentConfirmationsConfirmationIdRejectPostRequest;

  try {
    const data = await api.rejectConfirmationAgentConfirmationsConfirmationIdRejectPost(body);
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
| **confirmationId** | `number` |  | [Defaults to `undefined`] |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**ToolConfirmationInfo**](ToolConfirmationInfo.md)

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


## searchAgentSessionsAgentSessionSearchPost

> Array&lt;AgentSessionInfo&gt; searchAgentSessionsAgentSessionSearchPost(agentSessionSearchRequest, authorization, xUserTimezone)

Search Agent Sessions

### Example

```ts
import {
  Configuration,
  AgentApi,
} from '';
import type { SearchAgentSessionsAgentSessionSearchPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AgentApi();

  const body = {
    // AgentSessionSearchRequest
    agentSessionSearchRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies SearchAgentSessionsAgentSessionSearchPostRequest;

  try {
    const data = await api.searchAgentSessionsAgentSessionSearchPost(body);
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
| **agentSessionSearchRequest** | [AgentSessionSearchRequest](AgentSessionSearchRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**Array&lt;AgentSessionInfo&gt;**](AgentSessionInfo.md)

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


## steerQueuedMessageAgentSessionQueueSteerPost

> { [key: string]: any; } steerQueuedMessageAgentSessionQueueSteerPost(sessionId, messageId, authorization, xUserTimezone)

Steer Queued Message

把排队消息切进正在跑的轮。排队是默认,steer 是有意的「现在就改变你在做的事」。

### Example

```ts
import {
  Configuration,
  AgentApi,
} from '';
import type { SteerQueuedMessageAgentSessionQueueSteerPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AgentApi();

  const body = {
    // number
    sessionId: 56,
    // number
    messageId: 56,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies SteerQueuedMessageAgentSessionQueueSteerPostRequest;

  try {
    const data = await api.steerQueuedMessageAgentSessionQueueSteerPost(body);
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
| **sessionId** | `number` |  | [Defaults to `undefined`] |
| **messageId** | `number` |  | [Defaults to `undefined`] |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

**{ [key: string]: any; }**

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


## stopAgentTurnAgentSessionStopPost

> { [key: string]: any; } stopAgentTurnAgentSessionStopPost(agentSessionIdRequest, authorization, xUserTimezone)

Stop Agent Turn

停掉正在跑的轮,保留已产出的部分。没有在跑不是错误。

### Example

```ts
import {
  Configuration,
  AgentApi,
} from '';
import type { StopAgentTurnAgentSessionStopPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AgentApi();

  const body = {
    // AgentSessionIdRequest
    agentSessionIdRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies StopAgentTurnAgentSessionStopPostRequest;

  try {
    const data = await api.stopAgentTurnAgentSessionStopPost(body);
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
| **agentSessionIdRequest** | [AgentSessionIdRequest](AgentSessionIdRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

**{ [key: string]: any; }**

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


## streamAgentTurnAgentSessionSessionIdStreamGet

> any streamAgentTurnAgentSessionSessionIdStreamGet(sessionId, authorization, xUserTimezone)

Stream Agent Turn

SSE:正在跑的那轮的实时流(快照式:seq 变就推一帧,done 收尾)。

### Example

```ts
import {
  Configuration,
  AgentApi,
} from '';
import type { StreamAgentTurnAgentSessionSessionIdStreamGetRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AgentApi();

  const body = {
    // number
    sessionId: 56,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies StreamAgentTurnAgentSessionSessionIdStreamGetRequest;

  try {
    const data = await api.streamAgentTurnAgentSessionSessionIdStreamGet(body);
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
| **sessionId** | `number` |  | [Defaults to `undefined`] |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

**any**

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


## updateAgentSessionAgentSessionUpdatePost

> AgentSessionInfo updateAgentSessionAgentSessionUpdatePost(sessionId, agentSessionUpdateRequest, authorization, xUserTimezone)

Update Agent Session

### Example

```ts
import {
  Configuration,
  AgentApi,
} from '';
import type { UpdateAgentSessionAgentSessionUpdatePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new AgentApi();

  const body = {
    // number
    sessionId: 56,
    // AgentSessionUpdateRequest
    agentSessionUpdateRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xUserTimezone: xUserTimezone_example,
  } satisfies UpdateAgentSessionAgentSessionUpdatePostRequest;

  try {
    const data = await api.updateAgentSessionAgentSessionUpdatePost(body);
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
| **sessionId** | `number` |  | [Defaults to `undefined`] |
| **agentSessionUpdateRequest** | [AgentSessionUpdateRequest](AgentSessionUpdateRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xUserTimezone** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**AgentSessionInfo**](AgentSessionInfo.md)

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

