# GraphApi

All URIs are relative to *http://localhost:8001/api/main-service*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**documentGraphGraphDocumentPost**](GraphApi.md#documentgraphgraphdocumentpost) | **POST** /graph/document | Document Graph |
| [**graphGraphSearchPost**](GraphApi.md#graphgraphsearchpost) | **POST** /graph/search | Graph |
| [**sectionGraphGraphSectionPost**](GraphApi.md#sectiongraphgraphsectionpost) | **POST** /graph/section | Section Graph |



## documentGraphGraphDocumentPost

> GraphResponse documentGraphGraphDocumentPost(documentGraphRequest, authorization, xForwardedFor)

Document Graph

### Example

```ts
import {
  Configuration,
  GraphApi,
} from '';
import type { DocumentGraphGraphDocumentPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new GraphApi();

  const body = {
    // DocumentGraphRequest
    documentGraphRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies DocumentGraphGraphDocumentPostRequest;

  try {
    const data = await api.documentGraphGraphDocumentPost(body);
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
| **documentGraphRequest** | [DocumentGraphRequest](DocumentGraphRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xForwardedFor** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**GraphResponse**](GraphResponse.md)

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


## graphGraphSearchPost

> GraphResponse graphGraphSearchPost(authorization, xForwardedFor)

Graph

### Example

```ts
import {
  Configuration,
  GraphApi,
} from '';
import type { GraphGraphSearchPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new GraphApi();

  const body = {
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies GraphGraphSearchPostRequest;

  try {
    const data = await api.graphGraphSearchPost(body);
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

[**GraphResponse**](GraphResponse.md)

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


## sectionGraphGraphSectionPost

> GraphResponse sectionGraphGraphSectionPost(sectionGraphRequest, authorization, xForwardedFor)

Section Graph

### Example

```ts
import {
  Configuration,
  GraphApi,
} from '';
import type { SectionGraphGraphSectionPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new GraphApi();

  const body = {
    // SectionGraphRequest
    sectionGraphRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies SectionGraphGraphSectionPostRequest;

  try {
    const data = await api.sectionGraphGraphSectionPost(body);
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
| **sectionGraphRequest** | [SectionGraphRequest](SectionGraphRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xForwardedFor** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**GraphResponse**](GraphResponse.md)

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

