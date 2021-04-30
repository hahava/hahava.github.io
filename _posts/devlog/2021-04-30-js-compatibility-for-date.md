---
title: "2021.04.30-개발일지"
excerpt: "js별 date 처리"

categories:
 - dev_log
---

회사에서 업무중 ie11에서 정상적으로 로직이 처리되지 않는다는 연락을 받았습니다. chrome에선 정상적으로 실행됐기에 단순히 폴리필 문제라고 생각했지만, 이미 babel 정상적으로 작동되고 있었습니다. 혹시나 싶어 해당 기능을 safari에서 테스트 해본결과 동일한 문제가 발생하여 라인별 로깅을 통해 문제를 파악하였습니다.

## 브라우저별 date 처리 방식

확인결과 서버에서 전송한 날짜를 비교할때 chrome과 다른 브라우저간의 처리방식에 있어 문제가 발생했습니다.

서버에선 전송한 형식은 `'yyyy-mm-dd hh:mm:ss'` 였지만, ie와 safari에선 해당 값을 제대로 파싱하지 못했습니다. 확인 결과 브라우저별 `Date` 객체가 작동하는 방식은 아래와 같습니다.

```javascript
// safari 
new Date("2020-01-01")
new Date("2020-01-01T01:01:01")

// chrome
new Date("2020-01-01")
new Date("2020-1-01")
new Date("2020-01-1")

new Date("2020-01-01 01:01:00")
new Date("2020-01-01T01:01:00")

// exploler
new Date("2020-01-01")
new Date("2020-01-01T01:01:01")

// edge
new Date("2020-01-01")
new Date("2020-1-01")
new Date("2020-01-1")

new Date("2020-01-01 01:01:00")
new Date("2020-01-01T01:01:00")

// firefox
new Date("2020-01-01")
new Date("2020-1-01")
new Date("2020-01-1")

new Date("2020-01-01 01:01:00")
new Date("2020-01-01T01:01:00")
```

safari 와 explorer 가장 엄격하고 chrome과 firefox가 유연하게 지원하는 것 같습니다. 

## 날짜 파싱

위 문제를 해결하기 위해선 아래와 같이 파라미터별로 날짜 값을 하나씩 지정해주면 됩니다.

```javascript
let date = new Date(2020, 01, 01) // 2자리가 아니어도 가능
let date = new Date(2020, 01, 01, 01, 01, 01)
```

날짜 생성이 아나라 비교등을 위해 파싱해야 한다면 다음과 같이 처리할 수 있습니다.

```javascript
const today = new Date();
const year = today.getFullYear().toString();
const month = ("0" + (today.getMonth() + 1)).slice(-2);
const day = ("0" + today.getDate()).slice(-2)
```