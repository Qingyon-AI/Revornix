# SubscriptionControllerApi

All URIs are relative to *http://localhost:8080*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**appleCallback**](SubscriptionControllerApi.md#applecallback) | **POST** /subscription/callback/apple |  |
| [**confirmAppleSubscription**](SubscriptionControllerApi.md#confirmapplesubscription) | **POST** /subscription/apple/confirm |  |
| [**getSubscriptionStatus**](SubscriptionControllerApi.md#getsubscriptionstatus) | **POST** /subscription/status |  |
| [**prePaySubscription**](SubscriptionControllerApi.md#prepaysubscription) | **POST** /subscription/prepay |  |



## appleCallback

> object appleCallback(body)



### Example

```ts
import {
  Configuration,
  SubscriptionControllerApi,
} from '';
import type { AppleCallbackRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new SubscriptionControllerApi();

  const body = {
    // string
    body: body_example,
  } satisfies AppleCallbackRequest;

  try {
    const data = await api.appleCallback(body);
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
| **body** | `string` |  | |

### Return type

**object**

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `*/*`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | OK |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## confirmAppleSubscription

> ConfirmSubscriptionResponseDTO confirmAppleSubscription(confirmAppleSubscriptionRequestDTO)



### Example

```ts
import {
  Configuration,
  SubscriptionControllerApi,
} from '';
import type { ConfirmAppleSubscriptionRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new SubscriptionControllerApi();

  const body = {
    // ConfirmAppleSubscriptionRequestDTO
    confirmAppleSubscriptionRequestDTO: ...,
  } satisfies ConfirmAppleSubscriptionRequest;

  try {
    const data = await api.confirmAppleSubscription(body);
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
| **confirmAppleSubscriptionRequestDTO** | [ConfirmAppleSubscriptionRequestDTO](ConfirmAppleSubscriptionRequestDTO.md) |  | |

### Return type

[**ConfirmSubscriptionResponseDTO**](ConfirmSubscriptionResponseDTO.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `*/*`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | OK |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getSubscriptionStatus

> SubscriptionStatusResponseDTO getSubscriptionStatus(subscriptionStatusRequestDTO)



### Example

```ts
import {
  Configuration,
  SubscriptionControllerApi,
} from '';
import type { GetSubscriptionStatusRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new SubscriptionControllerApi();

  const body = {
    // SubscriptionStatusRequestDTO
    subscriptionStatusRequestDTO: ...,
  } satisfies GetSubscriptionStatusRequest;

  try {
    const data = await api.getSubscriptionStatus(body);
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
| **subscriptionStatusRequestDTO** | [SubscriptionStatusRequestDTO](SubscriptionStatusRequestDTO.md) |  | |

### Return type

[**SubscriptionStatusResponseDTO**](SubscriptionStatusResponseDTO.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `*/*`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | OK |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## prePaySubscription

> PrePaySubscriptionResponseDTO prePaySubscription(prePaySubscriptionRequestDTO)



### Example

```ts
import {
  Configuration,
  SubscriptionControllerApi,
} from '';
import type { PrePaySubscriptionRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new SubscriptionControllerApi();

  const body = {
    // PrePaySubscriptionRequestDTO
    prePaySubscriptionRequestDTO: ...,
  } satisfies PrePaySubscriptionRequest;

  try {
    const data = await api.prePaySubscription(body);
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
| **prePaySubscriptionRequestDTO** | [PrePaySubscriptionRequestDTO](PrePaySubscriptionRequestDTO.md) |  | |

### Return type

[**PrePaySubscriptionResponseDTO**](PrePaySubscriptionResponseDTO.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: `application/json`
- **Accept**: `*/*`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | OK |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

