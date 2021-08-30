---
title: "http vs socket vs websocket"
categories:
 - network
---

socket 통신을 단순히 http 와 반대되는 개념으로 연결이 지속적으로 유지되는 프로토콜정도로 이해하고 있었습니다. 그러나 최근 결제 모듈을 socket 통신으로 작성하면서 새롭게 그리고 잘못 알고 있는 내용을 정정하려 포스트로 기록합니다.

## socket

### vs http

우선 socket은 프로토콜이 아니며 그렇기에 http와 직접적인 비교가 불가능합니다. 일반적으로 socket 통신이라 함은 대부분 socket api 를 의미하며, 이것은 websoket 과도 궤를 달리합니다. socket의 정의는 다음과 같습니다.

> socket : ip 와 port로 이루어진 주소를 통해 두 기기가 서로 통신할때, 응용계층과 전송계층 사이에서 손쉽게 데이터를 주고 받을 수 있게 도와주는 API(Application Programming Interface)

정의한 내용처럼 소켓은 api 이며 프로토콜이 아닙니다. 아래 이미지와 같은 형태로 이해해야 합니다.

https://www.baeldung.com/cs/port-vs-socket

socket은 최초 BSD Unix 에서 제공되었으나 이후 [POSIX sockets](https://pubs.opengroup.org/onlinepubs/9699919799/functions/socket.html) 정의되어 대부분의 OS 에서 관련 기능을 제공합니다.

http 는 Stream socket를 활용한 application layer의 프로토콜로의 일종입니다.

### type of

소켓은 크게 2가지 종류가 있습니다.
- Stream socket : TCP를 사용하여 데이터 무결성을 보장. `java.net.serversocket` 로 구현 가능
- Datagram socket : UDP를 사용함. `java.net.datagramsocket` 구현 가능. listen 이나 accepct 함수가 존재하지 않음

## websocket

websocket은 http 와 같이 application layer 프로토콜의 일종입니다. 
