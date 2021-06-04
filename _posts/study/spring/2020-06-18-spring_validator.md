---
title: "Spring validator"
categories:
 - spring

---

Spring 은 JSR-303을 지원합니다. JSR-303 은 Java EE 와 Java SE에서 Bean Validation 을 지원하는 스펙입니다. Spring mvc 에서는 `Controller` 레벨에서의 사용자 입력에 대해 `DataBinding` 시점에서 validation 을 지원합니다. 



DataBinding이란 데이터를 객체에 맵핑하는 작업입니다. 사용자의 입력값을 동적으로 도메인 모델에 연결하는 역할을 합니다. `Validator` 와 `DataBinder` 는 `validation` 패키지에 선언되어 있습니다. spring mvc에선 `controller` 단위에서 databind을 진행하며 이때 validator를 자유롭게 사용가능합니다.



validator를 사용하는 방법은 2가지입니다. 첫번째는 spring의 validator 인터페이스를 직접 구현하는 방식이며 두번째는 hibernate를 이용하는 방식입니다. hibernate를 이용하면 도메인 레벨에서 어노테이션을 이용해서 간단하게 설정할 수 있다는 장점이 있습니다. 그러나 제공되는 어노테이션에 한계가 있기에 자유롭게 커스텀 하려면 인터페이스를 직접 구현하는 방법으로 진행해야 합니다.



## hibernate 설정

의존성을 추가합니다.

```xml
<dependency>
    <groupId>org.hibernate</groupId>
    <artifactId>hibernate-validator</artifactId>
</dependency>
```



도메인 요소에 맞는 어노테이션을 사용합니다. 이때 message 속성을 통해 사용자에게 전달한 에러 메시지를 설정할 수 있습니다.

```java
class Person{
    @Min(value=1, message="Age must be 1 or more") 
    int age;
    @NotNull(message="Name must not be null")
    String name;
}
```



http 요청 시 parameter 에 `@valid` 어노테이션을 작성합니다. 이때 추가적으로 `BindingResult` 를 입력받아야 합니다. BindingResult 객체가 실제로 데이터를 도메인에 맵핑하면서 유효성 검사를 진행하게 됩니다. 이때 검사를 통과하지 못하면 error를 등록하고 해당 내용을 아래와 같이 반환하도록 합니다.

```java
@RestController
public class InquiryController {

    private static final int FIRST_ERROR = 0;
  
    @PostMapping("/person")
    public String addPerson(@valid Person person, BindingResult br){
  	        if(br.hasErros()){
                String errMsg = br.getAllErrors().get(FIRST_ERROR).getDefaultMessage();
                return errMsg;
            }
          return "success"; 
    }
}
```



## Validator 구현하기

spring-core 에 validator 관련 클래스가 존재하기 때문에 특별히 의존성을 추가할 필요는 없습니다. Validator 인터페이스를 상속하여 오버라이드 메서드를 직접 구현해줍니다. validate 메서드에서는 아래와 같이  `ValidationUtils` 를 사용하거나 Object를 형변환하여 값을 직접 비교합니다.

```java
public class PersonValidator implements Validator {
	
  @Override
	public boolean supports(Class<?> clazz) {
		return Person.class.equals(clazz);
	}

	@Override
	public void validate(Object target, Errors errors) {
		ValidationUtils.rejectIfEmpty(errors, "name", "empty", "Name must not be null");
		Person person = (Person)target;
		if (person.age < 0) {
			errors.rejectValue("Age must be 1 or more");
		}
	}
}
```

hibernate를 사용했을 때와 동일하게 `@valid` 어노테이션을 선언합니다. 다른 점은 `@InitBinder` 를 선언하여 직접구현한 validator로 변경해야하는 것 입니다.

```java
@RestController
public class InquiryController {

    private static final int FIRST_ERROR = 0;
  
  	@InitBinder
	  public void initBinder(WebDataBinder webDataBinder){
		    webDataBinder.setValidator(new PersonValidator());
	  }
  
    @PostMapping("/person")
    public String addPerson(@valid Person person, BindingResult br){
  	        if(br.hasErros()){
                String errMsg = br.getAllErrors().get(FIRST_ERROR).getDefaultMessage();
                return errMsg;
            }
          return "success"; 
    }
}
```