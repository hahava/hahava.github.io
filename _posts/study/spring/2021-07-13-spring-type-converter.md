---
title: "Spring converter"
categories:
 - spring-mvc
---

spring 에서 개발시 controller에 맵핑된 query 또는 url-path 가 자료형에 구애받지 않는 것으로 보입니다.

```java
@GetMapping("/")
public ResponseEntity<Void> stringToInteger(@RequestParam Integer number) {
    System.out.println(number);
    return ResponseEntity.ok().build();
}
```

그러나, http 스펙은 자료형을 정의하지 않기 때문에 `@ReequestParam` 또는 `@PathVariable` 등에서 원하는 형태로 변수를 지정하는건 내부에서 `String`으로 전달된 값을 해당 자료형으로 변환해주기 때문입니다.


## Converter

Spring은 `org.springframework.core.convert.converter` 패키지에서 Converter 인터페이스를 제공합니다. 개발자는 해당 인터페이스를 구현하여 등록만 해주면 내부에서 사용하는 converter에 모두 적용 됩니다.

아래 예제는 String으로 지도 좌표가 들어왔을때, 해당 모델로 변경하는 예제입니다.

**Coordinates**
```java
@Getter
@Setter
public class Coordinates {
	private String latitude;
	private String longitude;
}
```
**StringToCoordinatesConverter**
```java
public class StringToCoordinatesConverter implements Converter<String, Coordinates> {
	@Override
	public Coordinates convert(String source) {
		String coordinatesStrings[] = source.split(",");

		Coordinates coordinates = new Coordinates();
		coordinates.setLatitude(coordinatesStrings[0]);
		coordinates.setLongitude(coordinatesStrings[1]);

		return coordinates;
	}
}
```

**controller**

```java
@GetMapping("/geo-location/{geoLocation}")
public ResponseEntity<Coordinates> stringToCoordinates(@PathVariable Coordinates geoLocation) {
    return ResponseEntity.ok(geoLocation);
}
```

## ConverseionService

만약, converter 를 직접 사용한다면 사용되는 코드의 양과 범위가 늘어나 문제가 될 것 입니다. Spring에선 `ConverseionService` 객체를 제공하며, 해당 객체를 통해 converter 를 사용하는 모든 곳에서 동일하게 적용될 수 있도록 합니다.

```java
@Configuration
public class WebMvcConfig implements WebMvcConfigurer {
	@Override
	public void addFormatters(FormatterRegistry registry) {
		registry.addConverter(new StringToCoordinatesConverter());
	}
}
```
