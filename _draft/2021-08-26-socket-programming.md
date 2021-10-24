---
title: "http vs socket vs websocket"
categories:
 - network
---

socket 통신을 단순히 http 와 반대되는 개념으로 연결이 지속적으로 유지되는 프로토콜정도로 이해하고 있었습니다. 그러나 최근 결제 모듈을 socket 통신으로 작성하면서 새롭게 그리고 잘못 알고 있는 내용을 정정하려 포스트로 기록합니다.

## socket

### vs http

우선 socket은 프로토콜이 아니며 그렇기에 http와 직접적인 비교가 불가능합니다. 일반적으로 socket 통신이라 함은 대부분 socket api 를 의미하며, 이것은 websoket 과도 궤를 달리합니다. socket의 정의는 다음과 같습니다.

> socket : ip 와 port로 이루어진 주소를 통해 두 기기가 서로 통신할때, 응용계층과(Application Layer) 전송계층(transport layer) 사이에서 손쉽게 데이터를 주고 받을 수 있게 도와주는 일종의 API

정의한 내용처럼 소켓은 api 이며 프로토콜이 아닙니다. 아래 이미지와 같은 형태로 이해해야 합니다.

<img src="{{site.baseurl}}/assets/img/socket.png">

socket은 최초 BSD Unix 에서 제공되었으나 이후 [POSIX sockets](https://pubs.opengroup.org/onlinepubs/9699919799/functions/socket.html) 정의되어 대부분의 OS 에서 관련 기능을 제공합니다.

Application layer의 정의된 protocol 은 대부분 운영체제에서 제공하는 socket을 사용하여 구현합니다.

### vs websocket

websocket은 이름에 socket이 포함되어 착각하기 쉽지만, http 와 같은 application layer 프로토콜의 일종입니다. http를 이용하여 최초 통신 이후 websocket 으로 전환하는 과정을 거쳐 실시간 양뱡향 통신을 구현할 수 있습니다.



### type of

소켓은 크게 2가지 종류가 있습니다.
- Stream socket : TCP를 사용하여 데이터 무결성을 보장. `java.net.serversocket` 로 구현 가능
- Datagram socket : UDP를 사용함. `java.net.datagramsocket` 구현 가능. listen 이나 accepct 함수가 존재하지 않음

#### server
```java
public static void main(String[] args) throws Exception {
  int port = 9000;
  ServerSocket serverSocket = new ServerSocket(9000);
  while (true) {
    Socket client = serverSocket.accept();

    BufferedReader bufferedReader
      = new BufferedReader(new InputStreamReader(client.getInputStream()));

    String input;
    while ((input = bufferedReader.readLine()) != null) {
      System.out.println("input : " + input + " / port : " + client.getPort());
      String response = ("Echo : " + input).concat("\r\n");
      client.getOutputStream().write(response.getBytes());
      client.getOutputStream().flush();
    }
  }
}
```
`ServerSocket` 객체를 이용하여 client로 부터 들어오는 tcp 요청을 처리할 수 있습니다. 이때 `InputStreamReader`를 활성화하여 데이터의 인입을 기다리는 동안 I/O blocking이 발생하게됩니다.

```java
public void start(ServerConfig serverConfig) throws IOException {
  ServerSocket serverSocket = new ServerSocket(9000);
  while (true) {
    new ServerHandler(serverSocket.accept()).start();
  }
}

private static class ServerHandler extends Thread {
  private Socket client;

  public ServerHandler(Socket client) {
    this.client = client;
  }

  @Override
  public void run() {
      var bufferedReader = new BufferedReader(new InputStreamReader(client.getInputStream()));
      var printWriter = new PrintWriter(new OutputStreamWriter(client.getOutputStream()), true);
      StringBuffer stringBuffer = new StringBuffer();
      String input;
      while ((input = bufferedReader.readLine()) != null) {
      System.out.println("input : " + input + " / port : " + client.getPort());
      var response = ("Echo : " + input).concat("\r\n");
      client.getOutputStream().write(response.getBytes());
      client.getOutputStream().flush();
      }
  }

  private boolean hasRequestBody(String input) {
    return input.contains("Content-Length:");
  }
}
```

만약, 해당 요청을 multi-thread로 처리하려면 위와 같이 작성할 수 있습니다.

#### client
```java
public static void main(String[] args) throws IOException {
  Socket echoSocket = new Socket("localhost", 9000);
  PrintWriter out = new PrintWriter(echoSocket.getOutputStream(), true);
  BufferedReader in = new BufferedReader(new InputStreamReader(echoSocket.getInputStream()));
  BufferedReader stdIn = new BufferedReader(new InputStreamReader(System.in));
  String userInput;

  while ((userInput = stdIn.readLine()) != null) {
    out.println(userInput);
    System.out.println("echo: " + in.readLine());
  }

  echoSocket.close();
}
```

clinet는 `Socket` 객체로 연결을 맺을 수 있으며, server와 동일하게 `inputStream` 활성화시 I/O blocking이 발생하게 됩니다.

