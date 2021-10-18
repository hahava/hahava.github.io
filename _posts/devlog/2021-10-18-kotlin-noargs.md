---
title: "2021.10.18-개발일지"
excerpt: "kotlin 에서 기본 생성자 사용하기"

categories:
 - dev_log
---

kotlin 에서 reflection 사용시 `java.lang.NoSuchMethodException` 에러 메시지가 발생했습니다. 해당 코드는 기본생성자가 없어 발생한 문제였습니다. reflection의 `newInstance` 메서드를 확인해보면 클래스의 정보를 가져오면서 이때 선언된 생성자들을 통해 객체를 만들게 되어 있습니다.

###### Class.java
```java
private Constructor<T> getConstructor0(Class<?>[] parameterTypes,
                                    int which) throws NoSuchMethodException
{
    Constructor<T>[] constructors = privateGetDeclaredConstructors((which == Member.PUBLIC));
    for (Constructor<T> constructor : constructors) {
        if (arrayContentsEq(parameterTypes,
                            constructor.getParameterTypes())) {
            return getReflectionFactory().copyConstructor(constructor);
        }
    }
    throw new NoSuchMethodException(getName() + ".<init>" + argumentTypesToString(parameterTypes));
}
```

그러나 제가 작성한 kotlin data 클래스에선 기본생성자가 존재하지 않기에 해당 생성자를 호출하지 못하였습니다. 이것을 해결하기 위해선 억지로 기본생성자 역할을 하는 `init` 블럭 또는 빈(empty) 생성자를 호출할 수 있게 property등의 기본값을 설정해야 합니다.

### noargs plugin 설정하기
기본값을 설정할 경우 data class의 본 용도와는 다르게 사용될 수 있기에 kotlin 의 [noargs](https://kotlinlang.org/docs/no-arg-plugin.html) 플러그인을 적용하여 해결 할 수 있습니다. 


###### build.gradle.kt
```gradle
import org.jetbrains.kotlin.noarg.gradle.NoArgExtension

plugins {
  id("org.jetbrains.kotlin.plugin.noarg") version "1.5.21"
}

configure<NoArgExtension> {
  annotation("com.example.demo.NoArg") // ......(1)
}

dependencies {
  implementation("org.jetbrains.kotlin:kotlin-noarg")
)
```

- (1) : plugin을 설정할 범위를 선택합니다. `NoArg` annotation을 선언한 클래스는 해당 플러그인이 적용됩니다.

###### main.kt
```kotlin
fun main(args: Array<String>) {
    val person = Person::class.java.getConstructor().newInstance()
}

@NoArg
data class Person(val name: String, val age: Int)

@Retention(AnnotationRetention.RUNTIME)
@Target(AnnotationTarget.CLASS)
annotation class NoArg
```

결과 추가적인 코드의 변경없이 reflection을 사용할 수 있습니다. 또한 해당 코드는 런타임시에 작동하므로 개발자가 직접 `Person()` 과 같이 빈 생성자로 객체를 생성할 수 없다는 장점이 있습니다.

