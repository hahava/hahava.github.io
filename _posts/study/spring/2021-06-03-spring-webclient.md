---
title: "webclient 정리"
categories:
 - spring
---

## WebClient

webclient는 web request를 처리하기 위한 인터페이스입니다. Spring Web Reactive의 모듈의 일부이며, Spring 5 이후 버전에선 Spring RestTemplate(spring 5.3 이후 deprecated 예정)를 대체합니다.


## WebClient vs RestTemplate
두 모듈의 가장 큰 차이는 동기/비동기 여부입니다. RestTemplate의 경우 모든 요청은 동기적으로 처리됩니다. 따라서 모든 request에 대한 response를 응답받기 전까지 해당 쓰레드는 blocking 되어 있으며, 이로 인해 불필요하게 컴퓨터 자원(cpu, memory)등을 점유합니다.


## Example

```java
@GetMapping("/sleep/{time}")
public ResponseEntity<String> time(@PathVariable String time) throws InterruptedException {
    Thread.sleep(Long.parseLong(time) * 1000);
    return ResponseEntity.ok(LocalDateTime.now().toString());
}
```

위와 같은 API를 제공하는 서버가 있을 떄 webclient 사용 예제입니다.

### case 1. webclient 객체를 사용하여 비동기 호출
```java
@GetMapping("/webclient")
public String test() {
    String seconds = "5";

    log.info("start");

    webClient.get()
        .uri("http://localhost:8080/sleep/" + seconds)
        .retrieve()
        .bodyToMono(String.class)
        .subscribe(log::info);

    log.info("stop");

    return "test";
}
```

위 코드의 결과 아래와 같이 log가 찍힙니다.

```bash
2021-06-04 11:29:27.105  INFO 5595 --- [nio-8080-exec-1] m.k.w.d.feat.controller.HomeController   : start
2021-06-04 11:29:27.734  INFO 5595 --- [nio-8080-exec-1] m.k.w.d.feat.controller.HomeController   : stop
2021-06-04 11:29:32.873  INFO 5595 --- [ctor-http-nio-2] m.k.w.d.feat.controller.HomeController   : 2021-06-04T11:29:32.838333
```

http 호출 결과 또는 순서에 상관없이 별드의 쓰레드가(`ctor-http-nio-2`) 생겨 해당 요청을 처리하는것을 확인 할 수 있습니다.


### case 2 webclient를 사용하여 동기식 호출

```java
@GetMapping("/webclient")
public String test() {
    String seconds = "5";

    log.info("start");

    String response = webClient.get()
        .uri("http://localhost:8080/sleep/" + seconds)
        .retrieve()
        .bodyToMono(String.class)
        .block(Duration.ofSeconds(6));
    log.info(response);

    log.info("stop");

    return "test";
}
```

위 코드의 결과 아래와 같이 log가 찍힙니다.

```bash
2021-06-04 11:34:37.016  INFO 6301 --- [nio-8080-exec-1] m.k.w.d.feat.controller.HomeController   : start
2021-06-04 11:34:42.802  INFO 6301 --- [nio-8080-exec-1] m.k.w.d.feat.controller.HomeController   : 2021-06-04T11:34:42.767649
2021-06-04 11:34:42.803  INFO 6301 --- [nio-8080-exec-1] m.k.w.d.feat.controller.HomeController   : stop
```

모든 방식은 순차적으로 진행되며 로그에서 확인할 수 있듯 동일한 쓰레드내에서 작업을 합니다. 

### case 3 webclient 설정 제어하기

```java
@GetMapping("/webclient")
public String test() {
    String seconds = "5";

    log.info("start");

    String response = webClient.get()
        .uri("http://localhost:8080/sleep/" + seconds)
        .exchangeToMono(clientResponse -> {
            if (clientResponse.statusCode().is4xxClientError()) {
                return Mono.error(new RuntimeException("Error"));
            }

            if (clientResponse.statusCode().is5xxServerError()) {
                return Mono.error(new HttpServerErrorException(HttpStatus.INTERNAL_SERVER_ERROR));
            }

            return clientResponse.bodyToMono(String.class);
        })
        .doOnError(throwable -> {
            log.error("doOnError");
            if (throwable.getClass() == HttpServerErrorException.class) {
                throw new HttpServerErrorException(HttpStatus.INTERNAL_SERVER_ERROR);
            }

            throw new RuntimeException(throwable.getMessage());
        })
        .doOnNext(body -> {
            if (body.equals("success")) {
                throw new RuntimeException("Error");
            }
        })
        .retryWhen(
            RetrySpec.max(3)
                .filter(throwable -> throwable.getClass() == HttpServerErrorException.class)
        )
        .block();

    log.info(response);

    return "test";
}
```

`retrieve()` 를 사용하면 4XX, 5XX 메시지의 경우를 제외한 나머지 http 요청을 정상으로 인식합니다. 그러나 Rest API 사용시 header, body, status code 관련 유효성을 검사할 필요가 생길 경우 `exchangeToMono` 또는 `exchangeToFlux`를 사용합니다. 해당 메서드 이용시 각종 이벤트 처리 관련 메서드를 추가적으로 체이닝 할 수 있습니다.

- exchangeToMono, exchangeToFlux : http status code를 검토하고 정상적으로 처리 할 것인지를 결정합니다.
- doOnError : 메서드 체이닝 중 발생한 모든 에러는 이곳으로 최종 전파 됩니다.
- doOnNext : 정상적으로 http method 요청 응답 시 추가적인 작업을 진행 할 수 있습니다.
- retryWhen : 에러 발생하여 정사적으로 처리되지 않았을 경우 조건에 맞춰 재시도를 합니다. 특정 조건 없이 재시도 하고 싶다면 `retry()` 메서드를 사용합니다. 이후에도 실패시 `doOnError` 에서 처리됩니다.