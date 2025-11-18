# SectionApi

All URIs are relative to *http://localhost:8001/api/main-service*

| Method | HTTP request | Description |
|------------- | ------------- | -------------|
| [**addLabelSectionLabelCreatePost**](SectionApi.md#addlabelsectionlabelcreatepost) | **POST** /section/label/create | Add Label |
| [**createSectionCommentSectionCommentCreatePost**](SectionApi.md#createsectioncommentsectioncommentcreatepost) | **POST** /section/comment/create | Create Section Comment |
| [**createSectionSectionCreatePost**](SectionApi.md#createsectionsectioncreatepost) | **POST** /section/create | Create Section |
| [**deleteLabelSectionLabelDeletePost**](SectionApi.md#deletelabelsectionlabeldeletepost) | **POST** /section/label/delete | Delete Label |
| [**deleteSectionCommentSectionCommentDeletePost**](SectionApi.md#deletesectioncommentsectioncommentdeletepost) | **POST** /section/comment/delete | Delete Section Comment |
| [**deleteSectionSectionDeletePost**](SectionApi.md#deletesectionsectiondeletepost) | **POST** /section/delete | Delete Section |
| [**deleteSectionUserSectionUserDeletePost**](SectionApi.md#deletesectionusersectionuserdeletepost) | **POST** /section/user/delete | Delete Section User |
| [**generatePodcastSectionPodcastGeneratePost**](SectionApi.md#generatepodcastsectionpodcastgeneratepost) | **POST** /section/podcast/generate | Generate Podcast |
| [**getAllMineSectionsSectionMineAllPost**](SectionApi.md#getallminesectionssectionmineallpost) | **POST** /section/mine/all | Get All Mine Sections |
| [**getDateSectionInfoSectionDatePost**](SectionApi.md#getdatesectioninfosectiondatepost) | **POST** /section/date | Get Date Section Info |
| [**getMySubscribedSectionsSectionSubscribedPost**](SectionApi.md#getmysubscribedsectionssectionsubscribedpost) | **POST** /section/subscribed | Get My Subscribed Sections |
| [**getSectionDetailSectionDetailPost**](SectionApi.md#getsectiondetailsectiondetailpost) | **POST** /section/detail | Get Section Detail |
| [**listLabelSectionLabelListPost**](SectionApi.md#listlabelsectionlabellistpost) | **POST** /section/label/list | List Label |
| [**publicSectionsSectionPublicSearchPost**](SectionApi.md#publicsectionssectionpublicsearchpost) | **POST** /section/public/search | Public Sections |
| [**searchMineSectionsSectionMineSearchPost**](SectionApi.md#searchminesectionssectionminesearchpost) | **POST** /section/mine/search | Search Mine Sections |
| [**searchSectionCommentSectionCommentSearchPost**](SectionApi.md#searchsectioncommentsectioncommentsearchpost) | **POST** /section/comment/search | Search Section Comment |
| [**searchUserSectionsSectionUserSearchPost**](SectionApi.md#searchusersectionssectionusersearchpost) | **POST** /section/user/search | Search User Sections |
| [**sectionDocumentRequestSectionDocumentsPost**](SectionApi.md#sectiondocumentrequestsectiondocumentspost) | **POST** /section/documents | Section Document Request |
| [**sectionPublishGetRequestSectionPublishGetPost**](SectionApi.md#sectionpublishgetrequestsectionpublishgetpost) | **POST** /section/publish/get | Section Publish Get Request |
| [**sectionPublishRequestSectionPublishPost**](SectionApi.md#sectionpublishrequestsectionpublishpost) | **POST** /section/publish | Section Publish Request |
| [**sectionRepublishSectionRepublishPost**](SectionApi.md#sectionrepublishsectionrepublishpost) | **POST** /section/republish | Section Republish |
| [**sectionSeoDetailRequestSectionDetailSeoPost**](SectionApi.md#sectionseodetailrequestsectiondetailseopost) | **POST** /section/detail/seo | Section Seo Detail Request |
| [**sectionUserAddRequestSectionUserAddPost**](SectionApi.md#sectionuseraddrequestsectionuseraddpost) | **POST** /section/user/add | Section User Add Request |
| [**sectionUserModifyRequestSectionUserModifyPost**](SectionApi.md#sectionusermodifyrequestsectionusermodifypost) | **POST** /section/user/modify | Section User Modify Request |
| [**sectionUserRequestSectionUserPost**](SectionApi.md#sectionuserrequestsectionuserpost) | **POST** /section/user | Section User Request |
| [**subscribeSectionSectionSubscribePost**](SectionApi.md#subscribesectionsectionsubscribepost) | **POST** /section/subscribe | Subscribe Section |
| [**updateSectionSectionUpdatePost**](SectionApi.md#updatesectionsectionupdatepost) | **POST** /section/update | Update Section |



## addLabelSectionLabelCreatePost

> SchemasDocumentCreateLabelResponse addLabelSectionLabelCreatePost(schemasDocumentLabelAddRequest, authorization, xForwardedFor)

Add Label

### Example

```ts
import {
  Configuration,
  SectionApi,
} from '';
import type { AddLabelSectionLabelCreatePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new SectionApi();

  const body = {
    // SchemasDocumentLabelAddRequest
    schemasDocumentLabelAddRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies AddLabelSectionLabelCreatePostRequest;

  try {
    const data = await api.addLabelSectionLabelCreatePost(body);
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
| **schemasDocumentLabelAddRequest** | [SchemasDocumentLabelAddRequest](SchemasDocumentLabelAddRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xForwardedFor** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**SchemasDocumentCreateLabelResponse**](SchemasDocumentCreateLabelResponse.md)

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


## createSectionCommentSectionCommentCreatePost

> NormalResponse createSectionCommentSectionCommentCreatePost(sectionCommentCreateRequest, authorization, xForwardedFor)

Create Section Comment

### Example

```ts
import {
  Configuration,
  SectionApi,
} from '';
import type { CreateSectionCommentSectionCommentCreatePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new SectionApi();

  const body = {
    // SectionCommentCreateRequest
    sectionCommentCreateRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies CreateSectionCommentSectionCommentCreatePostRequest;

  try {
    const data = await api.createSectionCommentSectionCommentCreatePost(body);
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
| **sectionCommentCreateRequest** | [SectionCommentCreateRequest](SectionCommentCreateRequest.md) |  | |
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


## createSectionSectionCreatePost

> SectionCreateResponse createSectionSectionCreatePost(sectionCreateRequest, authorization, xForwardedFor)

Create Section

### Example

```ts
import {
  Configuration,
  SectionApi,
} from '';
import type { CreateSectionSectionCreatePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new SectionApi();

  const body = {
    // SectionCreateRequest
    sectionCreateRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies CreateSectionSectionCreatePostRequest;

  try {
    const data = await api.createSectionSectionCreatePost(body);
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
| **sectionCreateRequest** | [SectionCreateRequest](SectionCreateRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xForwardedFor** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**SectionCreateResponse**](SectionCreateResponse.md)

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


## deleteLabelSectionLabelDeletePost

> NormalResponse deleteLabelSectionLabelDeletePost(schemasSectionLabelDeleteRequest, authorization, xForwardedFor)

Delete Label

### Example

```ts
import {
  Configuration,
  SectionApi,
} from '';
import type { DeleteLabelSectionLabelDeletePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new SectionApi();

  const body = {
    // SchemasSectionLabelDeleteRequest
    schemasSectionLabelDeleteRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies DeleteLabelSectionLabelDeletePostRequest;

  try {
    const data = await api.deleteLabelSectionLabelDeletePost(body);
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
| **schemasSectionLabelDeleteRequest** | [SchemasSectionLabelDeleteRequest](SchemasSectionLabelDeleteRequest.md) |  | |
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


## deleteSectionCommentSectionCommentDeletePost

> NormalResponse deleteSectionCommentSectionCommentDeletePost(sectionCommentDeleteRequest, authorization, xForwardedFor)

Delete Section Comment

### Example

```ts
import {
  Configuration,
  SectionApi,
} from '';
import type { DeleteSectionCommentSectionCommentDeletePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new SectionApi();

  const body = {
    // SectionCommentDeleteRequest
    sectionCommentDeleteRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies DeleteSectionCommentSectionCommentDeletePostRequest;

  try {
    const data = await api.deleteSectionCommentSectionCommentDeletePost(body);
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
| **sectionCommentDeleteRequest** | [SectionCommentDeleteRequest](SectionCommentDeleteRequest.md) |  | |
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


## deleteSectionSectionDeletePost

> NormalResponse deleteSectionSectionDeletePost(sectionDeleteRequest, authorization, xForwardedFor)

Delete Section

### Example

```ts
import {
  Configuration,
  SectionApi,
} from '';
import type { DeleteSectionSectionDeletePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new SectionApi();

  const body = {
    // SectionDeleteRequest
    sectionDeleteRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies DeleteSectionSectionDeletePostRequest;

  try {
    const data = await api.deleteSectionSectionDeletePost(body);
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
| **sectionDeleteRequest** | [SectionDeleteRequest](SectionDeleteRequest.md) |  | |
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


## deleteSectionUserSectionUserDeletePost

> NormalResponse deleteSectionUserSectionUserDeletePost(sectionUserDeleteRequest, authorization, xForwardedFor)

Delete Section User

### Example

```ts
import {
  Configuration,
  SectionApi,
} from '';
import type { DeleteSectionUserSectionUserDeletePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new SectionApi();

  const body = {
    // SectionUserDeleteRequest
    sectionUserDeleteRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies DeleteSectionUserSectionUserDeletePostRequest;

  try {
    const data = await api.deleteSectionUserSectionUserDeletePost(body);
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
| **sectionUserDeleteRequest** | [SectionUserDeleteRequest](SectionUserDeleteRequest.md) |  | |
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


## generatePodcastSectionPodcastGeneratePost

> NormalResponse generatePodcastSectionPodcastGeneratePost(generateSectionPodcastRequest, authorization, xForwardedFor)

Generate Podcast

### Example

```ts
import {
  Configuration,
  SectionApi,
} from '';
import type { GeneratePodcastSectionPodcastGeneratePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new SectionApi();

  const body = {
    // GenerateSectionPodcastRequest
    generateSectionPodcastRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies GeneratePodcastSectionPodcastGeneratePostRequest;

  try {
    const data = await api.generatePodcastSectionPodcastGeneratePost(body);
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
| **generateSectionPodcastRequest** | [GenerateSectionPodcastRequest](GenerateSectionPodcastRequest.md) |  | |
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


## getAllMineSectionsSectionMineAllPost

> AllMySectionsResponse getAllMineSectionsSectionMineAllPost(authorization, xForwardedFor)

Get All Mine Sections

### Example

```ts
import {
  Configuration,
  SectionApi,
} from '';
import type { GetAllMineSectionsSectionMineAllPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new SectionApi();

  const body = {
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies GetAllMineSectionsSectionMineAllPostRequest;

  try {
    const data = await api.getAllMineSectionsSectionMineAllPost(body);
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

[**AllMySectionsResponse**](AllMySectionsResponse.md)

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


## getDateSectionInfoSectionDatePost

> DaySectionResponse getDateSectionInfoSectionDatePost(daySectionRequest, authorization, xForwardedFor)

Get Date Section Info

### Example

```ts
import {
  Configuration,
  SectionApi,
} from '';
import type { GetDateSectionInfoSectionDatePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new SectionApi();

  const body = {
    // DaySectionRequest
    daySectionRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies GetDateSectionInfoSectionDatePostRequest;

  try {
    const data = await api.getDateSectionInfoSectionDatePost(body);
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
| **daySectionRequest** | [DaySectionRequest](DaySectionRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xForwardedFor** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**DaySectionResponse**](DaySectionResponse.md)

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


## getMySubscribedSectionsSectionSubscribedPost

> InifiniteScrollPagnitionSectionInfo getMySubscribedSectionsSectionSubscribedPost(searchSubscribedSectionRequest, authorization, xForwardedFor)

Get My Subscribed Sections

### Example

```ts
import {
  Configuration,
  SectionApi,
} from '';
import type { GetMySubscribedSectionsSectionSubscribedPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new SectionApi();

  const body = {
    // SearchSubscribedSectionRequest
    searchSubscribedSectionRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies GetMySubscribedSectionsSectionSubscribedPostRequest;

  try {
    const data = await api.getMySubscribedSectionsSectionSubscribedPost(body);
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
| **searchSubscribedSectionRequest** | [SearchSubscribedSectionRequest](SearchSubscribedSectionRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xForwardedFor** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**InifiniteScrollPagnitionSectionInfo**](InifiniteScrollPagnitionSectionInfo.md)

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


## getSectionDetailSectionDetailPost

> SectionInfo getSectionDetailSectionDetailPost(sectionDetailRequest, authorization, xForwardedFor)

Get Section Detail

### Example

```ts
import {
  Configuration,
  SectionApi,
} from '';
import type { GetSectionDetailSectionDetailPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new SectionApi();

  const body = {
    // SectionDetailRequest
    sectionDetailRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies GetSectionDetailSectionDetailPostRequest;

  try {
    const data = await api.getSectionDetailSectionDetailPost(body);
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
| **sectionDetailRequest** | [SectionDetailRequest](SectionDetailRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xForwardedFor** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**SectionInfo**](SectionInfo.md)

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


## listLabelSectionLabelListPost

> SchemasDocumentLabelListResponse listLabelSectionLabelListPost(authorization, xForwardedFor)

List Label

### Example

```ts
import {
  Configuration,
  SectionApi,
} from '';
import type { ListLabelSectionLabelListPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new SectionApi();

  const body = {
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies ListLabelSectionLabelListPostRequest;

  try {
    const data = await api.listLabelSectionLabelListPost(body);
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

[**SchemasDocumentLabelListResponse**](SchemasDocumentLabelListResponse.md)

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


## publicSectionsSectionPublicSearchPost

> InifiniteScrollPagnitionSectionInfo publicSectionsSectionPublicSearchPost(searchPublicSectionsRequest, authorization, xForwardedFor)

Public Sections

### Example

```ts
import {
  Configuration,
  SectionApi,
} from '';
import type { PublicSectionsSectionPublicSearchPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new SectionApi();

  const body = {
    // SearchPublicSectionsRequest
    searchPublicSectionsRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies PublicSectionsSectionPublicSearchPostRequest;

  try {
    const data = await api.publicSectionsSectionPublicSearchPost(body);
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
| **searchPublicSectionsRequest** | [SearchPublicSectionsRequest](SearchPublicSectionsRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xForwardedFor** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**InifiniteScrollPagnitionSectionInfo**](InifiniteScrollPagnitionSectionInfo.md)

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


## searchMineSectionsSectionMineSearchPost

> InifiniteScrollPagnitionSectionInfo searchMineSectionsSectionMineSearchPost(searchMineSectionsRequest, authorization, xForwardedFor)

Search Mine Sections

### Example

```ts
import {
  Configuration,
  SectionApi,
} from '';
import type { SearchMineSectionsSectionMineSearchPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new SectionApi();

  const body = {
    // SearchMineSectionsRequest
    searchMineSectionsRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies SearchMineSectionsSectionMineSearchPostRequest;

  try {
    const data = await api.searchMineSectionsSectionMineSearchPost(body);
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
| **searchMineSectionsRequest** | [SearchMineSectionsRequest](SearchMineSectionsRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xForwardedFor** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**InifiniteScrollPagnitionSectionInfo**](InifiniteScrollPagnitionSectionInfo.md)

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


## searchSectionCommentSectionCommentSearchPost

> InifiniteScrollPagnitionSectionCommentInfo searchSectionCommentSectionCommentSearchPost(sectionCommentSearchRequest, authorization, xForwardedFor)

Search Section Comment

### Example

```ts
import {
  Configuration,
  SectionApi,
} from '';
import type { SearchSectionCommentSectionCommentSearchPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new SectionApi();

  const body = {
    // SectionCommentSearchRequest
    sectionCommentSearchRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies SearchSectionCommentSectionCommentSearchPostRequest;

  try {
    const data = await api.searchSectionCommentSectionCommentSearchPost(body);
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
| **sectionCommentSearchRequest** | [SectionCommentSearchRequest](SectionCommentSearchRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xForwardedFor** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**InifiniteScrollPagnitionSectionCommentInfo**](InifiniteScrollPagnitionSectionCommentInfo.md)

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


## searchUserSectionsSectionUserSearchPost

> InifiniteScrollPagnitionSectionInfo searchUserSectionsSectionUserSearchPost(searchUserSectionsRequest, authorization, xForwardedFor)

Search User Sections

### Example

```ts
import {
  Configuration,
  SectionApi,
} from '';
import type { SearchUserSectionsSectionUserSearchPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new SectionApi();

  const body = {
    // SearchUserSectionsRequest
    searchUserSectionsRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies SearchUserSectionsSectionUserSearchPostRequest;

  try {
    const data = await api.searchUserSectionsSectionUserSearchPost(body);
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
| **searchUserSectionsRequest** | [SearchUserSectionsRequest](SearchUserSectionsRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xForwardedFor** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**InifiniteScrollPagnitionSectionInfo**](InifiniteScrollPagnitionSectionInfo.md)

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


## sectionDocumentRequestSectionDocumentsPost

> InifiniteScrollPagnitionSectionDocumentInfo sectionDocumentRequestSectionDocumentsPost(sectionDocumentRequest, authorization, xForwardedFor)

Section Document Request

### Example

```ts
import {
  Configuration,
  SectionApi,
} from '';
import type { SectionDocumentRequestSectionDocumentsPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new SectionApi();

  const body = {
    // SectionDocumentRequest
    sectionDocumentRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies SectionDocumentRequestSectionDocumentsPostRequest;

  try {
    const data = await api.sectionDocumentRequestSectionDocumentsPost(body);
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
| **sectionDocumentRequest** | [SectionDocumentRequest](SectionDocumentRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xForwardedFor** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**InifiniteScrollPagnitionSectionDocumentInfo**](InifiniteScrollPagnitionSectionDocumentInfo.md)

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


## sectionPublishGetRequestSectionPublishGetPost

> SectionPublishGetResponse sectionPublishGetRequestSectionPublishGetPost(sectionPublishGetRequest, authorization, xForwardedFor)

Section Publish Get Request

### Example

```ts
import {
  Configuration,
  SectionApi,
} from '';
import type { SectionPublishGetRequestSectionPublishGetPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new SectionApi();

  const body = {
    // SectionPublishGetRequest
    sectionPublishGetRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies SectionPublishGetRequestSectionPublishGetPostRequest;

  try {
    const data = await api.sectionPublishGetRequestSectionPublishGetPost(body);
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
| **sectionPublishGetRequest** | [SectionPublishGetRequest](SectionPublishGetRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xForwardedFor** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**SectionPublishGetResponse**](SectionPublishGetResponse.md)

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


## sectionPublishRequestSectionPublishPost

> NormalResponse sectionPublishRequestSectionPublishPost(sectionPublishRequest, authorization, xForwardedFor)

Section Publish Request

### Example

```ts
import {
  Configuration,
  SectionApi,
} from '';
import type { SectionPublishRequestSectionPublishPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new SectionApi();

  const body = {
    // SectionPublishRequest
    sectionPublishRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies SectionPublishRequestSectionPublishPostRequest;

  try {
    const data = await api.sectionPublishRequestSectionPublishPost(body);
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
| **sectionPublishRequest** | [SectionPublishRequest](SectionPublishRequest.md) |  | |
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


## sectionRepublishSectionRepublishPost

> NormalResponse sectionRepublishSectionRepublishPost(sectionRePublishRequest, authorization, xForwardedFor)

Section Republish

### Example

```ts
import {
  Configuration,
  SectionApi,
} from '';
import type { SectionRepublishSectionRepublishPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new SectionApi();

  const body = {
    // SectionRePublishRequest
    sectionRePublishRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies SectionRepublishSectionRepublishPostRequest;

  try {
    const data = await api.sectionRepublishSectionRepublishPost(body);
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
| **sectionRePublishRequest** | [SectionRePublishRequest](SectionRePublishRequest.md) |  | |
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


## sectionSeoDetailRequestSectionDetailSeoPost

> SectionInfo sectionSeoDetailRequestSectionDetailSeoPost(sectionSeoDetailRequest, authorization, xForwardedFor)

Section Seo Detail Request

### Example

```ts
import {
  Configuration,
  SectionApi,
} from '';
import type { SectionSeoDetailRequestSectionDetailSeoPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new SectionApi();

  const body = {
    // SectionSeoDetailRequest
    sectionSeoDetailRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies SectionSeoDetailRequestSectionDetailSeoPostRequest;

  try {
    const data = await api.sectionSeoDetailRequestSectionDetailSeoPost(body);
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
| **sectionSeoDetailRequest** | [SectionSeoDetailRequest](SectionSeoDetailRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xForwardedFor** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**SectionInfo**](SectionInfo.md)

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


## sectionUserAddRequestSectionUserAddPost

> NormalResponse sectionUserAddRequestSectionUserAddPost(sectionUserAddRequest, authorization, xForwardedFor)

Section User Add Request

### Example

```ts
import {
  Configuration,
  SectionApi,
} from '';
import type { SectionUserAddRequestSectionUserAddPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new SectionApi();

  const body = {
    // SectionUserAddRequest
    sectionUserAddRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies SectionUserAddRequestSectionUserAddPostRequest;

  try {
    const data = await api.sectionUserAddRequestSectionUserAddPost(body);
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
| **sectionUserAddRequest** | [SectionUserAddRequest](SectionUserAddRequest.md) |  | |
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


## sectionUserModifyRequestSectionUserModifyPost

> NormalResponse sectionUserModifyRequestSectionUserModifyPost(sectionUserModifyRequest, authorization, xForwardedFor)

Section User Modify Request

### Example

```ts
import {
  Configuration,
  SectionApi,
} from '';
import type { SectionUserModifyRequestSectionUserModifyPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new SectionApi();

  const body = {
    // SectionUserModifyRequest
    sectionUserModifyRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies SectionUserModifyRequestSectionUserModifyPostRequest;

  try {
    const data = await api.sectionUserModifyRequestSectionUserModifyPost(body);
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
| **sectionUserModifyRequest** | [SectionUserModifyRequest](SectionUserModifyRequest.md) |  | |
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


## sectionUserRequestSectionUserPost

> InifiniteScrollPagnitionSectionUserPublicInfo sectionUserRequestSectionUserPost(sectionUserRequest, authorization, xForwardedFor)

Section User Request

### Example

```ts
import {
  Configuration,
  SectionApi,
} from '';
import type { SectionUserRequestSectionUserPostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new SectionApi();

  const body = {
    // SectionUserRequest
    sectionUserRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies SectionUserRequestSectionUserPostRequest;

  try {
    const data = await api.sectionUserRequestSectionUserPost(body);
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
| **sectionUserRequest** | [SectionUserRequest](SectionUserRequest.md) |  | |
| **authorization** | `string` |  | [Optional] [Defaults to `undefined`] |
| **xForwardedFor** | `string` |  | [Optional] [Defaults to `undefined`] |

### Return type

[**InifiniteScrollPagnitionSectionUserPublicInfo**](InifiniteScrollPagnitionSectionUserPublicInfo.md)

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


## subscribeSectionSectionSubscribePost

> NormalResponse subscribeSectionSectionSubscribePost(sectionSubscribeRequest, authorization, xForwardedFor)

Subscribe Section

### Example

```ts
import {
  Configuration,
  SectionApi,
} from '';
import type { SubscribeSectionSectionSubscribePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new SectionApi();

  const body = {
    // SectionSubscribeRequest
    sectionSubscribeRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies SubscribeSectionSectionSubscribePostRequest;

  try {
    const data = await api.subscribeSectionSectionSubscribePost(body);
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
| **sectionSubscribeRequest** | [SectionSubscribeRequest](SectionSubscribeRequest.md) |  | |
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


## updateSectionSectionUpdatePost

> NormalResponse updateSectionSectionUpdatePost(sectionUpdateRequest, authorization, xForwardedFor)

Update Section

### Example

```ts
import {
  Configuration,
  SectionApi,
} from '';
import type { UpdateSectionSectionUpdatePostRequest } from '';

async function example() {
  console.log("🚀 Testing  SDK...");
  const api = new SectionApi();

  const body = {
    // SectionUpdateRequest
    sectionUpdateRequest: ...,
    // string (optional)
    authorization: authorization_example,
    // string (optional)
    xForwardedFor: xForwardedFor_example,
  } satisfies UpdateSectionSectionUpdatePostRequest;

  try {
    const data = await api.updateSectionSectionUpdatePost(body);
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
| **sectionUpdateRequest** | [SectionUpdateRequest](SectionUpdateRequest.md) |  | |
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

