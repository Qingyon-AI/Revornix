# BonusControllerApi

All URIs are relative to *http://localhost:8080*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**withdrawBonus**](BonusControllerApi.md#withdrawbonus) | **POST** /bonus/withdraw |  |



## withdrawBonus

> NormalResponseDTO withdrawBonus(bonusWithdrawRequestDTO)



### Example

```ts
import {
  Configuration,
  BonusControllerApi,
} from '';
import type { WithdrawBonusRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new BonusControllerApi();

  const body = {
    // BonusWithdrawRequestDTO
    bonusWithdrawRequestDTO: ...,
  } satisfies WithdrawBonusRequest;

  try {
    const data = await api.withdrawBonus(body);
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
| **bonusWithdrawRequestDTO** | [BonusWithdrawRequestDTO](BonusWithdrawRequestDTO.md) |  | |

### Return type

[**NormalResponseDTO**](NormalResponseDTO.md)

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

