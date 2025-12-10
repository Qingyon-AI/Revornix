# ProductControllerApi

All URIs are relative to *http://localhost:8080*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**getProductById**](ProductControllerApi.md#getproductbyid) | **POST** /product/detail |  |
| [**listProductAbility**](ProductControllerApi.md#listproductability) | **POST** /product/ability/list |  |
| [**prePayProduct**](ProductControllerApi.md#prepayproduct) | **POST** /product/prepay |  |



## getProductById

> GetProductResponseDTO getProductById(getProductRequestByUUIDDTO)



### Example

```ts
import {
  Configuration,
  ProductControllerApi,
} from '';
import type { GetProductByIdRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new ProductControllerApi();

  const body = {
    // GetProductRequestByUUIDDTO
    getProductRequestByUUIDDTO: ...,
  } satisfies GetProductByIdRequest;

  try {
    const data = await api.getProductById(body);
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
| **getProductRequestByUUIDDTO** | [GetProductRequestByUUIDDTO](GetProductRequestByUUIDDTO.md) |  | |

### Return type

[**GetProductResponseDTO**](GetProductResponseDTO.md)

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


## listProductAbility

> GetProductAbilitiesResponseDTO listProductAbility(getProductAbilitiesRequestDTO)



### Example

```ts
import {
  Configuration,
  ProductControllerApi,
} from '';
import type { ListProductAbilityRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new ProductControllerApi();

  const body = {
    // GetProductAbilitiesRequestDTO
    getProductAbilitiesRequestDTO: ...,
  } satisfies ListProductAbilityRequest;

  try {
    const data = await api.listProductAbility(body);
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
| **getProductAbilitiesRequestDTO** | [GetProductAbilitiesRequestDTO](GetProductAbilitiesRequestDTO.md) |  | |

### Return type

[**GetProductAbilitiesResponseDTO**](GetProductAbilitiesResponseDTO.md)

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


## prePayProduct

> PrePayProductResponseDTO prePayProduct(prePayProductRequestDTO)



### Example

```ts
import {
  Configuration,
  ProductControllerApi,
} from '';
import type { PrePayProductRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new ProductControllerApi();

  const body = {
    // PrePayProductRequestDTO
    prePayProductRequestDTO: ...,
  } satisfies PrePayProductRequest;

  try {
    const data = await api.prePayProduct(body);
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
| **prePayProductRequestDTO** | [PrePayProductRequestDTO](PrePayProductRequestDTO.md) |  | |

### Return type

[**PrePayProductResponseDTO**](PrePayProductResponseDTO.md)

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

