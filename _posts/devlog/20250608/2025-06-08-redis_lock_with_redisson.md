---
title: "Redisson으로 Redis Lock 구현 시 주의할 점과 해결 방법"
excerpt: "redis에서의 channel 과 stream"

categories:
 - dev_log

tags:
 - dev_log
 - redis
---


spring batch를 infra가 아닌 application layer에서 동시성을 방지하기 위해 redis로 lock을 잡으면서 알게된 내용들을 정리합니다.

## redic-cli

redis를 통해 lock를 획득 하는건 간단하게  `SET` 명령어와 `NX`  인자를 사용합니다.

```bash
# 1) 단순히 "존재하지 않을 때만" 키 설정
redis-cli> SET mylock "lock" NX
OK   # (키가 없으면 설정)  
# 또는
nil  # (키가 이미 있으면 설정 안 함)

# 2) TTL과 함께 사용 (초 단위)
redis-cli> SET mylock "lock" NX EX 30
OK   # (키가 없으면 값 저장 + 30초 후 자동 만료)
nil  # (키가 이미 있으면 아무 동작도 안 함)

# 3) TTL과 함께 사용 (밀리초 단위)
redis-cli> SET mylock "lock" NX PX 5000
OK   # (키가 없으면 값 저장 + 5초 후 만료)
nil  # (키가 이미 있으면 설정 안 함)
```

`KEY`존재 유무에 따라 응답값이 달라지며 nil 이 아닌 경우 lock획득을 가정할 수 있습니다.

## redis-client

`redison`이나 `lettuce`를 사용중이라면 이미 정의된client를 사용하여 편하게 사용 가능합니다. 저는 회사에서  redisson을 사용하기 때문에  redisson을 이용해서 아래와 같이 구현했습니다.

```kotlin
fun main(args: Array<String>) {
    val redissonConfig = Config()
    val redissonClient = Redisson.create(redissonConfig)

    val lock = redissonClient.getLock("lock") // ... (1)

    try {
        if (lock.tryLock(60, 60, TimeUnit.SECONDS)) { // ... (2)
            // doSomething()
        }
    } finally {
        lock.unlock() // ... (3)
    }
}
```

- (1)… 정해진 문자열로 lock을 정의합니다.
- (2)… tryLock() 을 통해 lock 획득을 시도합니다. 지정된 시간동안 내부에서 기다리며 재시도 합니다.
    - 몇시간 동안 시도하며 획득 이후 얼마나 유지 할 것인지 파라미터로 지정합니다
- (3)... lock 획득 이후 반드시 `unlock`을 통해 불필요하게 lock을 잡지 않도록 하는게 좋습니다.

개발 이후 lock을 테스트를 합니다.

- `lock` 을 키로 하여 lock을 잡음
- application 실행후 (2) 번에서 대기 하는지 확인
- `del` 명령어를 이용해 `lock` 키를 제거
- (2) 번 코드의 정상실행

위와 같은 순서로 정상 작동을 예상했으나 …실제로는 `del` 이후 application 이 정삭정으로 key를 획득하지 못해서 계속해서 기달리는 현상이 발생했습니다.

## redis queue

문제를 확인하기 위해 `tryLock` 메서드를 디버깅해 봅니다.

<img src="{{site.baseurl}}/assets/img/20250608/image.png">

<img src="{{site.baseurl}}/assets/img/20250608/image1.png">

코드를 따라가다보면 어디선가 `subscribe`하고 있는것을 확인할 수 있습니다. redis는 메모리 기반의 key-value 구조의 NoSQL로만 알고 있었는데 갑자기 subscribe라니요?

redis [공식문서](https://redis.io/glossary/redis-queue/)를 살펴보면 내부적으로 자체 queue 를 지원하고 있는것을 확인 할 수 있습니다. redisson은 이 queue를 이용해서 lock 의 획득과 반환 이벤트를 처리합니다.

```bash
# 현재 활성화 된 채널 
redis-cli> PUBSUB CHANNELS

# 특정 채널 구독
redis-cli> SUBSRIBE myChannel

# 특정 채널로 메시지 전송
redis-cli> PUBLISH myChannel 'hello world'
```

```bash
redis-cli> PUBLISH "redisson_lock__channel:{lock}" "1"
```

따라서 `del` 명령어가 아닌 publish 를 통해 특정 이벤트를 전송해야면 정상적으로 lock 을 획득할 수 있습니다.

<img src="{{site.baseurl}}/assets/img/20250608/image2.png">

(내부에서 0 과 1로 이벤트의 제어를 확인 할 수 있습니다.)

주의할 점은 redis queue는 클라이언트의 메시지 수신을 보장하지 않으며 중복 처리에 대한 메커니즘이 존재하지 않습니다. 따라서 반드시 수신이 보장되어야 한다면 성능이 조금 떨어지나 확실하게 lock을 잡을 수 있는 spin lock을 사용하는것이 좋을지도 모릅니다.

## spin lock

spin lock은 잠금이 해제될 때까지 반복해서 락 획득을 시도하는 방법입니다. 짧은 시간 동안만 락이 유지될때 사용하는 것이 좋으며 만약 lock 획득 시간이 길어진다면 불필요한 요청으로 시스템 자원의 소모가 발생할 수 있습니다.

```bash
┌──────────────────────────┐
│        tryLock()         │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│  SET NX PX <lockKey>     │   <── Redis에 락 시도
│  (존재하지 않으면 OK)        │
└───────┬──────────┬───────┘
        │          │
        │OK        │FAIL
        │          │
        ▼          ▼
┌──────────────┐ ┌──────────────────┐
│ 락 획득!       │ │   스핀 대기        │
│ (critical    │ │ (while 루프 또는   │
│  section)    │ │  sleep/backoff)  │
└──────────────┘ └─────────┬────────┘
                           │
                           ▼
                       ┌───────────┐
                       │ 다시 try   │
                       │ (SET NX)  │
                       └────┬──────┘
                            │
                            ▼
                           반복
```

redissClient 사용시 기본적으로 pub/sub 기반의 lock을 관리하지만 spin lock또한 사용 가능합니다.

```kotlin
val lock = redissonClient.getSpinLock("lock") {
    ExponentialBackOff() 
        .initialDelay(10)      // (1)...
        .multiplier(10)        // (2)...
        .maxDelay(100000)      // (3)...
        .create()
}
```

- (1)… 첫 번째 재시도 전 대기 시간을 10으로 시작합니다.
- (2)… 매번 재시도할 때마다 **이전 대기 시간 × 10**만큼 늘려 보려는 시도입니다.
    - 예: 첫째 대기 10 → 둘째 대기 10 × 10 = 100 → 셋째 100 × 10 = 1,000 …
- (3)… 모든 대기 시간은 최대 100000를 넘지 않도록 합니다.

## redis stream

pub/sub 방식의 안정성이 고민되고 spin lock의 성능이 고민된다면 redis 의 stream을 고민해볼 수 있습니다.

기존 메시지 큐와 달리, Redis Stream은 각 이벤트의 ID를 기반으로 순서를 유지하며, 소비자가 직접 처리 완료를 명시하기 전까지 메시지를 유지하므로 메시지 추적과 재처리가 가능합니다. 또한 RDB나 AOF 설정을 통해 디스크에 영속화할 수 있어 히스토리 관리도 지원됩니다.

<img src="{{site.baseurl}}/assets/img/20250608/image3.png">

[https://redis.io/blog/getting-started-with-redis-streams-and-java/](https://redis.io/blog/getting-started-with-redis-streams-and-java/)

```bash
# 1. 스트림에 메시지 추가 *를 사용할 경우 중복되지 않은 가장 큰 값을 event id 로 설정
redis-cli>  XADD mystream * name kalin birth_year 92
# => "1717312908123-0" (자동 생성된 메시지 ID 반환)

# 2. 소비자 그룹 생성 (스트림이 이미 있다면 MKSTREAM 생략 가능)
redis-cli> XGROUP CREATE mystream mygroup 0 MKSTREAM
# => OK (소비자 그룹 생성 성공)

# 3. 소비자 그룹을 통해 메시지 읽기
redis-cli> XREADGROUP GROUP mygroup consumer1 COUNT 1 STREAMS mystream >
# => 
# 1) 1) "mystream"
#    2) 1) 1) "1717312908123-0"
#          2) 1) "name"
#             2) "kalin"
#             3) "birth_year"
#             4) "92"
# (mygroup 그룹의 consumer1이 새 메시지를 읽음)

# 4. 메시지를 읽음(처리 완료) 처리
XACK mystream mygroup 1717312908123-0
# => (integer) 1 (정상 처리 완료됨을 Redis에 알림)

# XACK를 통해 이미 읽었던 메시지를 다시 읽는다면 빈 값을 반환
redis-cli> XREADGROUP GROUP mygroup consumer COUNT 1 STREAMS mystream >
(nil)
```

redisson에서 해당 기능을 사용하려면 아래와 같이 처리할 수 있습니다.

```kotlin
fun main(args: Array<String>) {
    val redissonConfig = Config().apply {
        useSingleServer().address = "redis://127.0.0.1:6379"
        codec = StringCodec()
    }

    val redissonClient = Redisson.create(redissonConfig)

		//(1)...
    val stream: RStream<String, String> = redissonClient.getStream("mystream") 
    stream.add(
        StreamAddArgs.entries(
            mapOf("name" to "kalin", "birth_year" to "92")
        )
    )

    val messages =
        stream.read(StreamReadArgs.greaterThan(StreamMessageId(10))) //(2)...

    messages.forEach { (id, data) ->
        println("Received $id -> $data")
    }

    if (!stream.listGroups().any { it.name == "mygroup" }) { //(3)...
        stream.createGroup("mygroup")
    }
    stream.createConsumer("mygroup", "consumer")

    //(4)...
    stream.add(
        StreamAddArgs.entries(
            mapOf("name" to "mj", "birth_year" to "95")
        )
    )

    //(5)...
    val messagesWithGroup = stream.readGroup(
        "mygroup",
        "consumer",
        StreamReadGroupArgs.neverDelivered()
    )

    messagesWithGroup.forEach { (id, data) ->
        println("Consumer received $id -> $data")
        stream.ack("mygroup", id) //(6)...
    }
}

```

- (1)… 스트림 객체 가져오기 (없으면 Redis에서 자동 생성)
- (2)… Stream 전체에서 ID > 10 인 메시지 조회
- (3)… Consumer Group이 존재하지 않으면 생성
- (4)… consumer 생성이후 이벤트 발행
- (5)… Consumer Group으로부터 아직 배달되지 않은 새 메시지 읽기
- (6)…  읽은 메시지를 출력하고, 수신 완료 처리 (XACK)

결과

```bash
Received 1748853832662-0 -> {name=kalin, birth_year=92}
Consumer received 1748853832668-0 -> {name=mj, birth_year=95}
```
