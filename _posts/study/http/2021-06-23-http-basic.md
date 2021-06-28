---
title: "01-http 기본"
categories:
 - http
---

Http는 `Hypertext transfer protocol`의 약자로 네트워크상의 프로토콜입니다.

### Resource
웹 서버는 리소스를 관리하고 제공합니다. 리소스는 단순한 정적파일만을 의미하는 것이 아닙니다. 웹에서 제공하는 모든 컨텐츠를 의미합니다.

### Media Type
http는 웹에서 전송되는 객체에 `MIME` 타입 이라는 데이터 포멧 라벨을 붙입니다. `MIME`은 이메일 시스템에서 사용하려 개발되었으나 그 편의성 덕분에 http에서도 채용되었습니다.

`MIME`은 사선으로(`/`) 주 타입과 부 타입을 구분합니다. 대소문자를 구분하지 않지만, 일반적으로 소문자를 사용합니다.

```text
- text/html
- text/plain
- image/jpeg
- image/gif
```

위와 같은 형태가 존재하며 서버에서는 아래와 같은 형태로 데이터를 반환합니다.

```http
Content-type : image/jpeg
Content-length : 12345
```

### URI
웹 서버 리소스는 각자 이름을 갖고 있습니다. 이에 클라리언트는 특정 리소스를 지목할 수 있으며, 그 이름을 URI(Uniform resource identifier)라 칭합니다.

```http
https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png
프로토콜://도메인        /리소스
```

### URL
URL은 (Uniform resource locator) 의 약자이며 자원의 위치를 의미합니다. URI은 URL을 포괄하는 개념이며 현재는 거의 동일한 의미로 사용되고 있습니다.

### Transaction
Http 통신은 정형화된 데이터를 통해 이루어지며 아래와 같은 형태를 가지고 있습니다.
```http
GET /images/branding/googlelogo/1x/googlelogo_color_272x92dp.png HTTP/1.1
Host: www.google.com
```

상기 요청에 대한 응답은 아래와 같은 형태입니다.
```http
HTTP/1.1 200 OK
content-type: image/png
Content-Length: 5969
```

### Method
http는 method라고 부리는 여러가지 종류의 요청 명령을 지원합니다. 모든 http 요청 메시지는 한 개의 메서드를 갖습니다. method는 서버에게 어떤 동작이 취해져야 함을 의미하면 자주사용되는 method는 아래와 같습니다.


| Http 메서드 | 설명 |
| :---: |---|
| GET | URI 해당 하는 리소스 요청 |
| POST | URI 해당 하는 이름으로 리소스를 저장 |
| PUT | URI 해당 하는 리소스 변경 |
| PUT | URI 해당 하는 리소스 삭제 |
| HEAD | URI에 해당하는 http 헤더 부분만 요청|


### Message

http 메시지는 단순한 줄 단위의 문자열입니디. 이진 형식이 아닌 일반 텍스트이기 때문에 사람이 읽고 쓰기 쉽습니다. 요청(request) 메시지와 응답(response) 메시지는 아래와 같은 형식으로 되어 있습니다.

### request
```http
GET / HTTP/1.1           -> 시작줄
Host: www.google.com     -> header
Accept: text/html        -> body

```

### response
```http
HTTP/1.1 200 OK                             -> 시작줄
Expires: -1                                 -> header
Content-Type: text/html; charset=ISO-8859
Server: gws
X-Frame-Options: SAMEORIGIN

<html></html>                               -> body
.......
```

**시작줄**  
메시지의 첫 줄은 시작줄로 요청의 경우 method, URL, http 버전등을 명시하며 응답의 경우 상태코드을 명시합니다.

**header**  
시작줄 다음에 이어지는 내용으로 `:` 통해 이름과 값으로 구분됩니다. 필드를 추가하려면 `\r\n` 으로 구분하며 마지막은 `\r\n\r\n`으로 끝납니다.

**body**  
header 이후 어떤 종류의 데이터든 들어갈 수 있는 메시지 본문이 필요에 따라 올 수 있습니다.

```java
public static void main(String[] args) throws IOException {
    Socket socket = new Socket("google.com", 80);
    PrintWriter printWriter = new PrintWriter(socket.getOutputStream());
    printWriter.print("GET / HTTP/1.1\r\n");
    printWriter.print("Host: www.google.com\r\n");
    printWriter.print("Accept: text/html\r\n\r\n");
    printWriter.flush();

    BufferedReader br = new BufferedReader(new InputStreamReader(socket.getInputStream()));
    while (socket.isConnected()) {
        if (br.readLine().equals("0")) {
            break;
        }
    }

    br.close();
    socket.close();
}
```