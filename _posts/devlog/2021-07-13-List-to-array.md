---
title: "2021.07.13-리스트를 배열로 바꾸기"

categories:
 - dev_log
---

java 에서 리스트를 배열로 또는 배열을 리스트로 변경하는 방법

### List to Array
```java
List<String> alphabet = List.of("a", "b", "c");
String[] stringArr = alphabet.toArray(new String[0]);
// String[] stringArr = alphabet.stream().toArray();

List<Integer> numbers = List.of(1, 2, 3, 4);
Integer numberArr[] = numbers.toArray(new Integer[0]);
// int numberArr[] = numbers.stream().mapToInt(i -> i).toArray(); 
```

### Array to list
```java
String[] stringArr = new String[]{"a", "b", "c"};
List<String> alphabet = Arrays.asList(stringArr);
//List<String> alphabet =  Arrays.stream(stringArr).collect(Collectors.toList());

int[] intArr = new int[] {1, 2, 3, 4};
List<Integer> numbers = Arrays.stream(intArr).boxed().collect(Collectors.toList());
```