---
title: "2021.10.20-개발일지"
excerpt: "mockserver로 외부 api 테스트하기"

categories:
 - dev_log
---

spring에서 외부에서 제공하는 api를 테스트 하고 싶었습니다. `webclient`를 이용하는데 service코드를 직접 호출하여 결과를 확인 할 수도 있었지만, 호출 전 또는 외부 서버의 상황에 구애받지 않고 테스트 하고 싶었습니다. 공식 문서와 구글링 결과 많이 사용하는 프레임워크로는 [mockserver-netty](https://www.mock-server.com/) 또는 [okhttp-mock](https://github.com/square/okhttp/tree/master/mockwebserver)등이 존재합니다. 


## 개발환경
2가지 방식의 예제를 살펴보기전에 외부 api서버를 호출하는 service코드 및 http response를 정의합니다.

###### Person.kt
```kotlin
data class Person(
        val age: Int,
        val name: String,
)
```

예제에 사용될 model 입니다.

###### PersonApi.kt
```kotlin
@Component
class PersonApi(
        @Value("\${person.api.host}") val host: String,
        @Value("\${person.api.path}") val path: String,
) {
    private val webClient: WebClient = WebClient.builder()
            .build()

    fun getPersonById(): Person {
        return webClient
                .get()
                .uri(host + path)
                .retrieve()
                .bodyToMono(Person::class.java)
                .block()!!
    }
}
```
webclient를 이용하여 api를 호출합니다. 이때 baseUrl 과 path를 분리합니다.

```http
GET /person Http 200 

{"name": "hahava","age": 30}
```

기대하는 결과값은 위와 같은 형태입니다.

## OkHttp MockerServer
[spring-docs](https://docs.spring.io/spring-framework/docs/current/reference/html/web-reactive.html#webflux-client-testing) 공식 문서에서 추천하는 프레임워크입니다. 안드로이드에서 okhttp를 webclient로 많이 사용하기 때문에 mockserver 개발시 함께 많이 사용하는 것으로 보입니다.


```gradle
testImplementation("com.squareup.okhttp3:okhttp:4.9.2")
testImplementation("com.squareup.okhttp3:mockwebserver:4.9.2")
```

위와 같이 2개의 라이브러리를 추가합니다. 이때 두 라이브러리의 버전은 일치해야 하며, 의존성 문제로 `okhttp`가 반드시 필요합니다. (버전이 일치 하지 않거나 `okhttp`추가 하지 않을 경우 `NoClassDeffoundError` 발생)

```kotlin
@SpringBootTest
class OkHttpServerTest {
    lateinit var mockWebServer: MockWebServer

    lateinit var personApi: PersonApi

    @Value("\${person.api.path}")
    lateinit var path: String

    @BeforeEach
    fun init() {
        val mockServerPort = 8888

        mockWebServer = MockWebServer()
        mockWebServer.start(mockServerPort) // ... (1)

        personApi = PersonApi("http://localhost:$mockServerPort", path) // ... (2)
    }

    @AfterEach
    fun destroy() {
        mockWebServer.shutdown()
    }

    @Test
    fun getPersonTest() {
        val mockResponse = MockResponse() // ... (3)
                .setResponseCode(200)
                .setBody("""
                        {
                          "name": "hahava",
                          "age": 30
                        }
                """.trimIndent()) 
                .addHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON)

        mockWebServer.enqueue(mockResponse) // ... (4)

        val person = personApi.getPersonById()
        assertThat(person.age).isEqualTo(30)
        assertThat(person.name).isEqualTo("hahava")

        val recordedRequest = mockWebServer.takeRequest() // ... (5)
        assertThat(recordedRequest.path).isEqualTo(path)
        assertThat(recordedRequest.method).isEqualTo(HttpMethod.GET.toString())
    }
}
```

- (1): mock 서버를 실행할 port를 정합니다.
- (2): 실행된 mock 서버와 동일한 port 및 host를 지정해야 합니다.
- (3): 외부 서버의 api 응답에 대한 예상 결과 값을 지정합니다.
- (4): 정해진 응답(MockResponse)을 queue에 추가합니다. 여러개의 resoonse를 설정하면 request전송 순서 별 매칭됩니다.
- (5): 실제 service코드가 실행된 후 기록하여 해당 변수에 할당합니다. 선언 순서별로 추가적인 기록을 할 수 있습니다.

이떄 주의할점은 path 값에 상관없이 host:port 만 동일하면 request가 캡쳐됩니다.

## Netty Mockserver

이름이 netty라서 꼭 [netty](https://netty.io/index.html)와 관련있나 싶지만 딱히 연관성은 잘 모르겠습니다.

```gradle
testImplementation("org.mock-server:mockserver-netty:5.11.1")
testImplementation("org.mock-server:mockserver-client-java:5.11.1")
```

`OkHttp` 와 비슷하게 동일한 버전으로 2가지 라이브러리를 추가합니다.

```kotlin
@SpringBootTest
class NettyServerTest {
    lateinit var mockWebServer: ClientAndServer

    lateinit var personApi: PersonApi

    @Value("\${person.api.path}")
    lateinit var path: String

    @BeforeEach
    fun init() {
        val mockServerPort = 8888

        mockWebServer = ClientAndServer.startClientAndServer(mockServerPort)// ... (1)
        personApi = PersonApi("http://localhost:$mockServerPort", path) // ... (2)
    }

    @AfterEach
    fun destroy() {
        mockWebServer.stop()
    }

    @Test
    fun getPersonTest() {
        mockWebServer.`when`( // ... (3)
                HttpRequest.request()
                        .withMethod(HttpMethod.GET.toString())
        ).respond(
                HttpResponse.response()
                        .withHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                        .withBody("""
                        {
                          "name": "hahava",
                          "age": 30
                        }
                        """.trimIndent()
                        )
        )

        val person = personApi.getPersonById()
        Assertions.assertThat(person.age).isEqualTo(30)
        Assertions.assertThat(person.name).isEqualTo("hahava")
    }
}
```

- (1): mock 서버를 실행할 port를 정합니다.
- (2): 실행된 mock 서버와 동일한 port 및 host를 지정해야 합니다.
- (3): request에 대한 response값을 설정합니다. 이때 okhttp와는 다르게 반드시 path가 일치해야 성공합니다.

개인적으로는 `netty-mockserver`가 가독성이 더 좋아서 선호합니다.