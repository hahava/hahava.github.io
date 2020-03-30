---
title: "2020.03.30-개발일지"
excerpt: "Daily Dev Log"

categories:
 - dev_log
tags:
 - dev_log
 - java

class: wide
---

### 주제

`Scanner` 또는 `System.out.println` 을 유틸 함수로 래핑하여 중복을 제거



### 목표

유틸클래스를 작성하여 해당 메서드에서 유효성검사 등의 기능을 제공



### 고민한 내용

`BufferdReader` close() 호출 후 다시 객체를 생성하려 하면 `java.io.IOException: Stream closed` 에러 발생



### 알게된 내용

##### System.in

System 클래스의 in 인스턴스의 설명은 아래와 같이 주석으로 잘 되어 있음

```java
    /**
     * The "standard" input stream. This stream is already
     * open and ready to supply input data. Typically this stream
     * corresponds to keyboard input or another input source specified by
     * the host environment or user.
     */
    public final static InputStream in = null;
```

close 후에는 `in` 객체의 스트림이 닫히며, 실행중에는 해당 스트림을 다시 연결 할 수 없음. 프로그램 종료 직전에 close 하거나 `Console` 객체를 사용하면 됨



##### Java 에서 사용자 입력을 받는 3가지 방법

1. BufferdReader
   - Java 1.1 부터 사용
   - 명시적인 에러처리 필요
   - 속도가 매우빠름
   - 입력에 대한 validation을 직접 구현해야 함
2. Scanner
   - Java 1.5 부터 생김
   - 명시적인 예외처릴 할 필요 없음
   - line, token 별로 read 하는 등의 다양한 기능을 제공
   - 속도가 느림
3. Console
   - Java 1.6 부터 사용 
   - 명시적인 예외처리가 필요 없음
   - Scanner와 BufferdReader의 장점을 모두 가져옴 (암호 읽기 *** 기능도 제공함)
   - 에디터에서 안되는 경우가 있음. NullPointerException 발생. Console 객체와 에디터의 콘솔이 매칭이 안되서 발생한 문제

##### 결론

다양한 상황속에서 용동에따라 분리해서 사용할 것 

- 빠른 속도가 필요한 경우 -> BufferdReader
- 암호, 개인정보등 추가적인 처리가 필요할 경우 -> Console
- 형타입, 정규식 표현등을 그대로 사용하고 싶을 때 -> Scanner
- Thread-safe 하게 사용해야 하는 경우 -> Console 또는 BufferdReader



```java
public class ConsoleUtil {

	private static final BufferedReader BUFFERED_READER = new BufferedReader(new InputStreamReader(System.in));
	private static final BufferedWriter BUFFERED_WRITER = new BufferedWriter(new OutputStreamWriter(System.out));
	public static final String HORIZONTAL_RULE = "=================================";

	public static String readString(String msg) throws IOException {
		printLn(msg);
		String input = BUFFERED_READER.readLine();
		return input;
	}

	public static int readInt(String msg) throws IOException {
		printLn(msg);
		int parseInt = 0;
		boolean success = false;
		while (success != true) {
			String input = BUFFERED_READER.readLine();
			try {
				parseInt = Integer.parseInt(input);
				success = true;
			} catch (NumberFormatException e) {
				printLn("숫자만 입력해주세요!");
			}
		}
		return parseInt;
	}

	public static void printLn(String msg) throws IOException {
		BUFFERED_WRITER.write(msg);
		BUFFERED_WRITER.newLine();
		BUFFERED_WRITER.flush();
	}

	public static void close() throws IOException {
		BUFFERED_READER.close();
		BUFFERED_WRITER.close();
	}
}

```

위와 같이 작성 후, 프로그램 종료직전 `close()` 호출 하기로 결정



### 공부할 내용

Stream에 대한 이해가 많이 부족한 것 같다고 느낌



