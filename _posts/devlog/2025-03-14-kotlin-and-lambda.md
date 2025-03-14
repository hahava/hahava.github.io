---
title: "2025.03.14-함수형 언어 kotlin 그런데 jvm을 곁들인..."
excerpt: "코틀린에서 람다의 작동방식 및 최적화"

categories:
 - dev_log

tags:
 - dev_log
---

```kotlin
import io.vavr.control.Try
import org.slf4j.LoggerFactory

fun main() {
    val subService = SubService()
    val service = Service(subService)

    service.doSomeThing()
}

class Service(
    private val subService: SubService,
) {
    val logger = LoggerFactory.getLogger(this.javaClass)

    fun doSomeThing() {
        Try.ofSupplier {
            logger.info("service.doSomeThing()")
            subService.doSomeThing()
        }.recover { throwable ->
            logger.error("recover", throwable)
            emptyMap<String, Int>()
        }.get()
    }
}

class SubService {
    val logger = LoggerFactory.getLogger(this.javaClass)

    fun doSomeThing() {
        logger.info("subService.doSomething()")
    }
}
```

Try.ofSupplier를 이용한 예외처리 코드 입니다. ofSupplier 내부 로직을 실행하고 실패시 recover를 호출하는 평범한 코드로 보이지만 성능상 문제가 발생할 수도 있습니다.

그렇다면 문제가 발생할수도 있는 부분은?


## Byte코드 분석하기

해당 코드는 별 문제가 없어보이자만 바이트코드로 컴파일 후 java로 디컴파일을 하게 되면 recover의 내부 동작에서 문제를 확인 할 수 있습니다.

<img src="{{site.baseurl}}/assets/img/kotlin-lambda-bytecode.png">


메서드를 실행할때마다 `Function` 객체를 지속적으로 생성하고 있는데, 해당 코드는 단순히 로그 처리 후 동일한 객체를 반환기때문에 굳이 `Function` 객체를 지속적으로 생성할 필요는 없습니다. 

간단한 기능이라 실제 운영환경에서도 별 문제가 없지만 메모리 레퍼런스가 참조되거나 사이즈가 큰 객체를 관리한다면 성능에 악영향을 미칠 수 있습니다.

## Java에서 익명 클래스와 람다표현식
<img src="{{site.baseurl}}/assets/img/interview.png">

### 2019년 신입 면접 당시 단골 질문 소재


> **Q. JDK 1.8의 특징은 ?**
> 
> A. 
> ...
> - `람다식(Lambda expressions)`
> - 함수형 인터페이스 (Functional Interface)
> - 디폴트 메서드 ( Default Method) 
> 
> ...
> 
> **Q. 람다식의 특징은 ?**
> 
> A. 음… 가독성 향상…?

jdk 1.8의 특징에 대한 설명이 신입 면접 단골 질문이었던걸로 기억합니다. 당시에 저는 람다식 관련한 내용 가독성 향상을 언급했었는데 시간이 지나고 보니 조금은 아쉬운 답변인 것 같습니다.

단순한 가독성외에도 내부 구현방식에 따른 성능향상이 존재하는데 이 역시 컴파일러를 통해 바이트코드를 분석해보면 차이를 확인할 수 있습니다.

### 컴파일러를 통한 바이트 코드 분석
<img src="{{site.baseurl}}/assets/img/abstract-class-with-bytecode.png">

바이트 코드 분석시 동일한 기능을 하는 두 코드의 차이점을 발견할 수 있습니다.

- **Main$1 vs lambdaMetaFactory**
- **invokeSpecial vs invokeDynamic**

### 익명 클래스

차이점을 살펴보기 앞서 우선은 익명클래스에 대한 정의가 일부 필요합니다.

```java
// jdk1.8 이전의 익명클래스 생성 방식
Runnable oldRunnable = new Runnable() {
	@Override
	public void run() {
		System.out.println("Hello, world!");
	}
};
oldRunnable.run();
```

- 이름 없이 즉석에서 정의하는 내부 클래스로, 특정 인터페이스나 클래스를 구현할 때 사용
- 컴파일 시 별도의 .class 파일(예: $Main$1.class)이 생성되며, JVM에서 로드됨.
    - 매번 새로운 익명 클래스를 생성하면 `지속적인 클래스 로딩이 발생할 수 있음`.
- 멀티 쓰레드 환경에서의 동시성 문제를 해결하기 위해 `final 변수만 가능한다.`

<img src="{{site.baseurl}}/assets/img/abstract-class-final.png">

> **`Effectively Final` 이란?**
>
> 변수에 final 을 붙이지 않았지만, 값이 변경되지 않아 final 과 유사하게 동작하는 것

> **`변수 캡쳐링` 이란?** 
>
> 파라미터로 넘겨받은 데이터가 아닌 람다식 외부에서 정의된 변수를 참조하는 변수를 람다식 내부에 저장하고 사용하는 동작을 의미한다.
>

### invokeSpecial vs invokeDynamic
람다는 `invokedynamic` 으로 익명함수는 `invokespecial` 로 작동합니다. 해당 키워드는 바이트코드 명려어의 집합으로 jvm이 실행하는 최소 단위 명령어 입니다.

[opcode에 대한 설명](https://docs.oracle.com/javase/specs/jvms/se21/html/jvms-6.html)을 기반으로 메서드를 호출하는 관련 코드는 아래와 같이 정리할 수 있습니다.

| 명령어 | 설명 | 사용사례 |
| --- | --- | --- |
| invokestatic | 정적 메서드 호출 | Math.sqrt(4) |
| invokevirtual | 인스턴스 메서드 호출	 | obj.toString() |
| invokeinterface | 인터페이스 메서드 호출 | list.add("hello") |
| invokespecial | 부모 클래스 메서드 호출 및 생성자 호출	 | super.toString() |
| invokedynamic | ??? | ??? |

### invokedynamic은 ?

[oracle post](https://blogs.oracle.com/javamagazine/post/understanding-java-method-invocation-with-invokedynamic
) 내용 기반으로 정리하면 invokedynamic은 아래와 같은 특징을 갖습니다.

- `최초 호출 시점에만 메서드 핸들을 생성`하고, 이후에는 `캐싱하여 재사용 가능`
- JIT(Just-In-Time) 컴파일러가 `실행 중 최적화하여 불필요한 오버헤드를 제거 가능`
- 람다가 `상태를 가지지 않으면 동일한 인스턴스를 재사용`하여 메모리 절약 가능
    - 상태를 가진다는 의미 ⇒ 람다 캡쳐링이 발생했다는 것
        ```java
        // 람다 캡쳐링
        int a = 1;
        Runnable lambdaRunnable = () -> {
            System.out.println(a);
        };
        lambdaRunnable.run();
        ```


## kotlin에선 어떻게 처리될까?

**Kotlin은 Java의 다양한 버전을 호환**

<img src="{{site.baseurl}}/assets/img/kotlin-java-legacy.png">

하위 호환성의 흔적이 남아있는 모습으로 object 를 이용할 경우 내부적으로는 익명클래스를 사용해서 구현됩니다.

**kotlin만의 고유한 특징**

<img src="{{site.baseurl}}/assets/img/kotlin-var-val.png">

kotlin에선 `var`와 `val`의 차이만 있을뿐 `effectivly fianl`의 개념은 따로 존재하지 않는다. 람다 캡쳐링시 단순 참조가 아니라 수정이 가능하며 이것은 클로저를 완전하게 지원한다고 볼 수 있습니다.

람다에서 변수를 참조하면 `Ref` 객체를 사용하여 감싸는데, 이는 변수 변경을 가능하게 하지만 성능에 영향을 줄 수도 있습니다. 특히 메모리 할당이 많아지는 경우 주의해야 합니다.

## 개선해보기

### object: 형태로 객체를 생성하지 않고 람다 표현식을 사용한다.

```kotlin
// bad 
val anonymousRunnable = object: Runnable{
    override fun run() {
        println("hello lambda")
    }
}
anonymousRunnable.run()

// good!
val lambdaRunnable = Runnable { println("hello lambda") }
lambdaRunnable.run()
```

### 람다 캡쳐링을 가능한 하지 않는다.

<img src="{{site.baseurl}}/assets/img/kimjongmin.gif">

가능한 사용하지 않는게 좋겠지만 로직상에서 반드시 사용해야 할 경우… 

1. var대신 val 키워드를 사용
    
    <img src="{{site.baseurl}}/assets/img/val-instead-var.png">
    
    val 키워드를 사용하여 컴파일러에게 일종의 힌트를 제공합니다. 
    컴파일러는 Ref 객체를 사용하지 않도록 최적화 되어 있는 모습을 확인할 수 있습니다.
    

1. 변수를 파라미터로 전달
    
    <img src="{{site.baseurl}}/assets/img/variable-with-parameter.png">
    
    전달하는 객체를 파라미터로 처리하여 heap이 아닌 stack으로 유도합니다. 
    객체를 참조하거나 복사할 필요가 없기 때문에 invokeDynamic 으로 처리하서면 객체를 복사하지도 않습니다.


### 일급 객체 함수를 사용할것

<img src="{{site.baseurl}}/assets/img/first-object.png">

일급 객체를 이용하여 invokedynamic을 유도한 모습, java 코드로 변환시 singletone으로 관리됨니다.

### inline을 통해 컴파일러 최적화를 유도

<img src="{{site.baseurl}}/assets/img/inline.png">

`inline` 키워드를 이용한 최적화를 진행합니다. inline 키워드는 컴파일 단계에서 불필요한 객체 생성을 방지하고 가능하다면 코드를 직접 첨부하는식으로 작동합니다.

예제 코드에서 inline 코드를 처리하지 않은 영역은 메서드 호출시 Function 객체를 지속적으로 생성하는 것을 확인 할 수 있습니다.

### 최신 버전의 컴파일러 사용하기

<img src="{{site.baseurl}}/assets/img/versionup.png">

kotlin jvm이 2.0.0 버전 이후부턴 invokeDynamic을 [기본전략](https://kotlinlang.org/docs/whatsnew20.html#generation-of-lambda-functions-using-invokedynamic)으로하여 최적화가 진행됩니다. kotlin compiler 를 2.0.0 이상 버전으로 버전업 후 컴파일한 결과를 분석해보면 특별한 처리가 없어도 최적화가 되어 있는 모습을 확인할 수 있습니다.


## 주의 & 결론
- intellij 에서 byte code를 다시 decompile 한 결과는 intellij의 해석이라 실제 호출과는 다를 수 있음
- 깊이 있는 분석을 위해선 byte code외 jit compiler의 작동 내용도 분석이 필요
- 버전업을 잘하는 것 만으로도 상당한 이득을 볼 수 있음
    - 그럼에도 람다 사용시 좋은 코딩 습관을 가진다면 좋겠다!
