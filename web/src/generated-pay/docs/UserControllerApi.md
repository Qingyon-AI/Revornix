# UserControllerApi

All URIs are relative to *http://localhost:8080*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**checkAuthority**](UserControllerApi.md#checkauthority) | **POST** /user/ability/check |  |
| [**getUserInfo**](UserControllerApi.md#getuserinfo) | **POST** /user/info |  |



## checkAuthority

> boolean checkAuthority(checkAbilityRequestDTO)



### Example

```ts
import {
  Configuration,
  UserControllerApi,
} from '';
import type { CheckAuthorityRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new UserControllerApi();

  const body = {
    // CheckAbilityRequestDTO
    checkAbilityRequestDTO: ...,
  } satisfies CheckAuthorityRequest;

  try {
    const data = await api.checkAuthority(body);
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
| **checkAbilityRequestDTO** | [CheckAbilityRequestDTO](CheckAbilityRequestDTO.md) |  | |

### Return type

**boolean**

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


## getUserInfo

> UserResponseDTO getUserInfo()



### Example

```ts
import {
  Configuration,
  UserControllerApi,
} from '';
import type { GetUserInfoRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new UserControllerApi();

  try {
    const data = await api.getUserInfo();
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

[**UserResponseDTO**](UserResponseDTO.md)

### Authorization

No authorization required

### HTTP request headers

- **Content-Type**: Not defined
- **Accept**: `*/*`


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
| **200** | OK |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)

