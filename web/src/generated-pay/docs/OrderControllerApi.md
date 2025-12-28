# OrderControllerApi

All URIs are relative to *http://localhost:8080*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**alipayCallback**](OrderControllerApi.md#alipaycallback) | **POST** /order/callback/alipay |  |
| [**getOrderDetail**](OrderControllerApi.md#getorderdetail) | **POST** /order/detail |  |
| [**getOrderDetailByPaypalOrder**](OrderControllerApi.md#getorderdetailbypaypalorder) | **POST** /order/detail/paypal |  |
| [**getOrderStatus**](OrderControllerApi.md#getorderstatus) | **POST** /order/status |  |
| [**paypalCallback**](OrderControllerApi.md#paypalcallback) | **POST** /order/callback/paypal |  |
| [**weChatCallback**](OrderControllerApi.md#wechatcallback) | **POST** /order/callback/wechat |  |



## alipayCallback

> alipayCallback()



### Example

```ts
import {
  Configuration,
  OrderControllerApi,
} from '';
import type { AlipayCallbackRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new OrderControllerApi();

  try {
    const data = await api.alipayCallback();
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters

This endpoint does not need any parameter.

### Return type

`void` (Empty response body)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: Not defined


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | OK |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


## getOrderDetail

> GetOrderDetailResponseDTO getOrderDetail(getOrderDetailRequestDTO)



### Example

```ts
import {
  Configuration,
  OrderControllerApi,
} from '';
import type { GetOrderDetailRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new OrderControllerApi();

  const body = {
    // GetOrderDetailRequestDTO
    getOrderDetailRequestDTO: ...,
  } satisfies GetOrderDetailRequest;

  try {
    const data = await api.getOrderDetail(body);
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
| **getOrderDetailRequestDTO** | [GetOrderDetailRequestDTO](GetOrderDetailRequestDTO.md) |  | |

### Return type

[**GetOrderDetailResponseDTO**](GetOrderDetailResponseDTO.md)

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


## getOrderDetailByPaypalOrder

> GetOrderDetailResponseDTO getOrderDetailByPaypalOrder(getOrderDetailByPaypalOrderRequestDTO)



### Example

```ts
import {
  Configuration,
  OrderControllerApi,
} from '';
import type { GetOrderDetailByPaypalOrderRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new OrderControllerApi();

  const body = {
    // GetOrderDetailByPaypalOrderRequestDTO
    getOrderDetailByPaypalOrderRequestDTO: ...,
  } satisfies GetOrderDetailByPaypalOrderRequest;

  try {
    const data = await api.getOrderDetailByPaypalOrder(body);
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
| **getOrderDetailByPaypalOrderRequestDTO** | [GetOrderDetailByPaypalOrderRequestDTO](GetOrderDetailByPaypalOrderRequestDTO.md) |  | |

### Return type

[**GetOrderDetailResponseDTO**](GetOrderDetailResponseDTO.md)

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


## getOrderStatus

> OrderStatusResponseDTO getOrderStatus(orderStatusRequestDTO)



### Example

```ts
import {
  Configuration,
  OrderControllerApi,
} from '';
import type { GetOrderStatusRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new OrderControllerApi();

  const body = {
    // OrderStatusRequestDTO
    orderStatusRequestDTO: ...,
  } satisfies GetOrderStatusRequest;

  try {
    const data = await api.getOrderStatus(body);
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
| **orderStatusRequestDTO** | [OrderStatusRequestDTO](OrderStatusRequestDTO.md) |  | |

### Return type

[**OrderStatusResponseDTO**](OrderStatusResponseDTO.md)

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


## paypalCallback

> object paypalCallback(body)



### Example

```ts
import {
  Configuration,
  OrderControllerApi,
} from '';
import type { PaypalCallbackRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new OrderControllerApi();

  const body = {
    // string
    body: BYTE_ARRAY_DATA_HERE,
  } satisfies PaypalCallbackRequest;

  try {
    const data = await api.paypalCallback(body);
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


## weChatCallback

> weChatCallback()



### Example

```ts
import {
  Configuration,
  OrderControllerApi,
} from '';
import type { WeChatCallbackRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new OrderControllerApi();

  try {
    const data = await api.weChatCallback();
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```

### Parameters

This endpoint does not need any parameter.

### Return type

`void` (Empty response body)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: Not defined


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | OK |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

