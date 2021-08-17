---
title: "Spring exception"
categories:
 - spring
---

spring 애플리케이션을 실행 후 예외 발생 시 경우에 따른 플로우 및 처리 방법을 정리합니다.

## servlet 관점

servlet은 2가지 방법으로 예외를 처리할 수 있습니다.
- Exception 발생
- response.sendError()

servlet에서 예외가 발생하면 web container는 `web.xml`에서 에러 관련 설정을 찾아 수행하게 됩니다.

```xml
<web-app>
  <error-page>
    <error-code>404</error-code>
    <location>/error/404.html</location>
  </error-page>
  <error-page>
    <exception-type>java.lang.Exception</exception-type>
    <location>/error/500.html</location>
  </error-page>
</web-app>
```

## spring 및 servlet 통합 관점

spring 이 들어간다 하여도 기본적인 수행 방식에는 변함이 없습니다. WAS에서 spring 을 호출하는 방식이기에 `request/response` 을 처리하는 모든 과정에 동일하게 적용됩니다.

<img src="{{site.baseurl}}/assets/img/servlet-exception-flow.png">

중요한 점은 예외가 발생했을 때 `try-catch`등으로 처리를 안할시 WAS까지 전파되었다가 다시 error 관련 코드를 호출한다는 점입니다. 해당 코드는 spring boot 기준 기본적으로 `/error`로 맵핑 되어 있으며 `BasicErrorController`에 정의되어 있습니다. 만약, 사용자가 커스텀하게 수정하려면 `properties`를 수정하거나 `WebServerFactoryCustomizer`를 구현합니다.

```java
public class WebServerCustomizer implements WebServerFactoryCustomizer<ConfigurableWebServerFactory> {
	@Override
	public void customize(ConfigurableWebServerFactory factory) {
		factory.addErrorPages(new ErrorPage(HttpStatus.NOT_FOUND, "/error/404"));
	}
}
```

### filter

예외 발생시 filter가 전부 실행되는 것은 아닙니다. filter는 dispathcer type 속성이 있으며, `DispatcherType.ERROR` 타입으로 지정한 경우에만 호출됩니다.

```java
@Bean
public FilterRegistrationBean<Filter> sampleFilter() {
  FilterRegistrationBean<Filter> filterFilterRegistrationBean = new FilterRegistrationBean<>();
  filterFilterRegistrationBean.setFilter(new SampleFilter());
  filterFilterRegistrationBean.setOrder(1);
  filterFilterRegistrationBean.addUrlPatterns("/*");
  filterFilterRegistrationBean.setDispatcherTypes(DispatcherType.ERROR, DispatcherType.REQUEST);
  return filterFilterRegistrationBean;
}
```

### interceptor

interceptor의 경우 `excludeUrl`을 통해 error 발생시 추가적으로 interceptor를 호출하지 않게 할 수 있습니다. 

```java
@Override
public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler,
    Exception ex) throws Exception {
    log.error("exception occurred");
}
```

`afterCompletion` 메서드에서 예외를 처리할 수 있습니다.

## Spring 관점
`BasicErrorController`를 이용하면 에러코드별 html 파일을 편리하게 제공할 수 있습니다. 그러나 만약, API를 요청한다면 어떻게 예외를 처리해야 할까요? API 결과에 따라 응답 값을 데이터 포멧에 맞춰 세밀하게 응답해야 합니다.

### ExceptionHandlerResolver
controller에서 예외가 발생하여 controller를 벗어난 경우, `HandlerExceptionResolver` 를 구현하여 예외를 처리할 수 있습니다.

```java
public class CustomHandlerException implements HandlerExceptionResolver {
@Override
public ModelAndView resolveException(HttpServletRequest request, 
    HttpServletResponse response,
    Object handler, Exception ex) {

    if (ex instanceof RuntimeException) {
        try {
            response.sendError(HttpServletResponse.SC_BAD_REQUEST);
            //response.setContentType("application/json");
            //response.getWriter().write("error!");
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    return new ModelAndView();
  }
}
```

`null` 반환시에는 추가적인 exceptionResolver를 찾게되며 마지막까지 해결되지 않을 경우, 기존 방식처럼 에러 관련 코드를 호출합니다. sendError 를 호출하면 servlet container 는 기존 방식 그대로 에러 관련 코드를 호출합니다. 만약, handlerResolver 에서 완전한 처리를 원하면(다시 되돌아 오지 않는..) 주석처리된 것 처럼 response 객체를 조작하면 됩니다.


```java
@Configuration
public class WebMvcConfig implements WebMvcConfigurer {
  @Override
  public void extendHandlerExceptionResolvers(List<HandlerExceptionResolver> resolvers) {
    resolvers.add(new CustomHandlerException());
  }
}
```

작성한 HandlerExceptionResolver는 webMvcConfiturrer에 등록해야 정상 작동합니다.
> `configureViewResolvers` 가 아닌 `extendHandlerExceptionResolvers` 를 호출해야 합니다. configureViewResolvers 호출시
 기존에 spring에서 작성한 기본 exceptionResolver가 전부 초기화 됩니다.

### ExceptionHandler

```java
@ExceptionHandler(RuntimeException.class)
public ResponseEntity<String> globalExceptionHandler() {
  return ResponseEntity.ok("error");
}

@GetMapping("/runtime")
public void error() {
  throw new RuntimeException("error");
}
```
`@ExceptionHandler` 는 controller 내에서만 적용됩니다. 다른 controller에서도 사용하려면 새롭게 코드를 작성해야 합니다. `@ExceptionHandler` 는 자식 클래스의 예외를 상속합니다. 예를 들어 RuntimeException 을 상속한 예외가 발생했을떄 `@ExceptionHandler` 등록되어 있지 않다면 `@ExceptionHandler(RuntimeException.class)`가 실행 됩니다.우선순위는 좀더 자세한 것이 우선순위를 갖습니다. 만약, 부모 자식 둘 다 존재한다면, 자식 예외 관련 handler가 호출됩니다.

### 전역적으로 예외처리하기

`@ControllAdvice` 또는 `@RestControllerAdvice`를 사용하면 controller 에 상관없이 전역적으로 예외를 처리할 수 있습니다. 두 어노테이션의 차이는 @ResponseBody의 유무 입니다.

```java
@ControllerAdvice
public class GlobalExceptionHandler {
	@ExceptionHandler(RuntimeException.class)
	public ResponseEntity<String> globalExceptionHandler() {
		return ResponseEntity.internalServerError().build();
	}
}
```

예외를 처리할 클래스에 `@ControllerAdvice` 선언하면 작동합니다. 만약, 특정 controller또는 패키지등을 지정하려면 assignableTypes,basePackage 등으로 지정할 수 있습니다.