---
title: "2022.01.11-개발일지"
excerpt: "HttpServletRequest body 조작하기"

categories:
 - dev_log
---
최근 `HttpServletRequest` 객체의 body를 `controller`진입 이후 참조할 상황이 생겼습니다.<br>
이와 관련하여 발생했던 문제점들을 간단하게 정리합니다.

## HttpServletRequest 참조하기
spring에서 `HttpServletRequest`객체를 참조하는 방법은 크게 2가지가 있습니다.

```java
HttpServletRequest httpServletRequest = 
  ((ServletRequestAttributes)RequestContextHolder.getRequestAttributes()).getRequest()
```
RequestContextHolder를 통해 ThreadLocal로 저장된 HttpServletRequest 객체를 참조할 수 있습니다.

```java
@Autowired HttpServletRequest httpServletRequest
```
`@Autowired`는 `RquestScope`로 정의된 bean을 참조할 수 있습니다.

## Http body 참조하기
위와 같은 방법을 통해 얻은 객체로 `getInputStream()`호출하면 직렬화 하기전 내용을 얻을 수 있을 것이라 예상되지만 실제로는 빈 값을 반환합니다.

```java
@Override
public ServletInputStream getInputStream() throws IOException {

  if (usingReader) {
      throw new IllegalStateException(sm.getString("coyoteRequest.getInputStream.ise"));
  }

  usingInputStream = true;
  if (inputStream == null) {
      inputStream = new CoyoteInputStream(inputBuffer);
  }
  return inputStream;

}
```

상기 코드는 Request.java의 getInputStream() 입니다. if문을 통해 inputstream read 여부 확인하는 것을 볼 수 있습니다.
Controller에서 parameter로 넣어주기 위해 해당 함수를 미리 호출했기에 이후 부터는 빈 값을 반환합니다.

## interceptor에선 request 조작하기

spring에선 `HttpServletRequestWrapper`를 사용하여 새로운 HttpServletRequest를 생성하거나 `ContentCachingRequestWrapper`를 이용하여 content를 여러번 호출할 수 있는 형태로 변환할 수 있습니다. 성능을 생각해서 DispathcerServlet이후 작업을 해야겠다고 생각했고 아래와 같이 interceptor에서 request를 변경하기로 했습니다.

```java
// interceptor
@Override
public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
  throws Exception {
  ContentCachingRequestWrapper httpServletRequestWrapper = new ContentCachingRequestWrapper(request);
  return super.preHandle(httpServletRequestWrapper, response, handler);
}

// component
public void logRequestBody() throws IOException {
  HttpServletRequest httpServletRequest =
    ((ServletRequestAttributes)RequestContextHolder.getRequestAttributes()).getRequest();

  ContentCachingRequestWrapper contentCachingRequestWrapper = (ContentCachingRequestWrapper)httpServletRequest;
  String body = new String(contentCachingRequestWrapper.getContentAsByteArray(), StandardCharsets.UTF_8);

  System.out.println(body);
}
```
그러나 예상과는 다르게 `ClassCastException` 발생하여 정상적으로 실행되지 않았습니다. 
실제 호출부를 확인해보면 HttpServletRequest 타입으로 호출 및 지역변수로 사용되기 때문입니다.

```java
boolean applyPreHandle(HttpServletRequest request, HttpServletResponse response) 
  throws Exception {
  for (int i = 0; i < this.interceptorList.size(); i++) {
    HandlerInterceptor interceptor = this.interceptorList.get(i);
    if (!interceptor.preHandle(request, response, this.handler)) { // (1)
      triggerAfterCompletion(request, response, null);
      return false;
    }
    this.interceptorIndex = i;
  }
  return true;
}
```

따라서 filter에서 처리해야 정상적으로 형변환이 되어 사용할 수 있습니다.

```java
public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
  throws IOException, ServletException {
  HttpServletRequest httpServletRequest = (HttpServletRequest)request;
  ContentCachingRequestWrapper contentCachingRequestWrapper = new ContentCachingRequestWrapper(httpServletRequest);
  chain.doFilter(contentCachingRequestWrapper, response);
}
```

이후 HttpServletRequest객체를 ContentCachingRequestWrapper로 형반환 후에 자유롭게 사용할 수 있습니다.