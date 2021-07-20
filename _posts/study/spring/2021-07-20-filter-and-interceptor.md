---
title: "filter and interceptor"
categories:
 - spring
---

filter와 interceptor는 둘 다 공통로직을 처리한다는 특징이 있습니다. 두 기술의 가장 큰 차이점으로는 관리 주체가 다르다는 점 입니다. 

<img src="{{site.baseurl}}/assets/img/http-request-flow.png">

filter는 servlet에서 제공하는 고유 기능이며 web application에 등록, servlet 은  spring에서 제공하는 기능이며 spring context에 등록됩니다. 따라서 interceptor는 spring의 모든 기능을 사용할 수 있지만 filter는 불가능 합니다. 

## filter
filter는 dispatcher servlet 호출 이전에 호출됩니다. 따라서 경로를 매칭하는 과정에서 연산(매우 미미할테지만...)이 들어갈 수 있음을 고려해야 합니다. 

```java
public class SampleFilter implements Filter {
  @Override
  public void init(FilterConfig filterConfig) throws ServletException {
  }

  @Override
  public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
    throws IOException, ServletException {
    chain.doFilter(request, response);
  }

  @Override
  public void destroy() {
  }
}
```

filter는 `javax.servlet` 패키지의 filter 인터셉터를 구현합니다. `init()` 는 filter가 초기화 될 때 한번, `destroy()` 는 application context가 종료 될 때 한번씩만 호출됩니다. filter를 통과하려면 `chain.doFilter()` 메서드를 호출하여 다음 filter를 수행 하도록 합니다.

```java
@Bean
public FilterRegistrationBean<Filter> sampleFilter() {
    FilterRegistrationBean<Filter> filterFilterRegistrationBean = new FilterRegistrationBean<>();
    filterFilterRegistrationBean.setFilter(new SampleFilter());
    filterFilterRegistrationBean.setOrder(1);
    filterFilterRegistrationBean.addUrlPatterns("/*");
    return filterFilterRegistrationBean;
}
```

이후 `filterFilterRegistrationBean` 를 통해 작성된 filter를 등록합니다. 

## interceptor

interceptor 는 `HandlerInterceptor` 인터페이스를 구현하여 작성합니다.

```java
public class SampleInterceptor implements HandlerInterceptor {
  @Override
  public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
    throws Exception {
    return true;
  }

  @Override 
  public void postHandle(HttpServletRequest request, HttpServletResponse response, Object handler,
    ModelAndView modelAndView) throws Exception {
  }

  @Override 
  public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler,
    Exception ex) throws Exception {
  }
}
```
interceptor는 3개의 메서드를 제공합니다. 
- preHandler: controller 호출 전. order 순서대로 호출 
- postHandler: controller 정상 호출. order 역순으로 호출
- afterCompletion: 요청이 완전하게 끝난 이후. 즉, 클라이언트에게 response를 보낸후 처리. postHandler와의 차이점은 예외가 발생해도 반드시 호출됨

filter와 비슷하게 preHandler 에서 `true/false` 여부로 다음 interceptor 또는 controller에 request를 넘길 것인지 결정 할 수 있습니다.

<img src="{{site.baseurl}}/assets/img/interceptor.png">

작성된 interceptor는 WebMvcConfigurer 의  `addInterceptors` 오버라이드 하여 등록합니다.
```java
public class WebMvcConfig implements WebMvcConfigurer {
  @Override
  public void addInterceptors(InterceptorRegistry registry) {
    registry.addInterceptor(new SampleInterceptor()).addPathPatterns("/**").order(0);
  }
}
```

## filter vs interceptor
1. spring의 기능을 사용해야 하는가 ?? -> interceptor
2. 예외를 어디서 어떻게 처리해야 하나 ?? (filter -> servlet , interceptor -> spring)
3. 전역적으로 관리가 필요한가 ?? -> filter
4. 요청 전후의 작업이 필요한가 ?? -> interceptor