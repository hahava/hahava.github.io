---
title: "분산 시스템 환경에서 key획득 하기"
# excerpt: "System stream 객체를 close() 했을 때 발생하는 문제점"

categories:
 - dev_log
---
과거 담당했던 서비스에선 중복되지 않는 숫자를 통해 해쉬값을 생성하는 로직이 존재했습니다. 해당 서비스의 DB 마이그레이션을 담당하게 되었는데 이 과정에서 발생했던 문제점과 해결방안에 대한 고찰을 정리합니다.

많은 서비스에서 데이터의 중복 혹은 id를 확인하기 위해 고유값을 설정합니다. 보통 sql의 primary key를 사용하며 auto_increment등을 통해 중복을 해결하곤 합니다. 담당했던 서비스의 dbms는 cubrid였고 이것을 mysql로 옮기는 작업을 진행했습니다.

문제는 고유키를 통해 해쉬값을 만드는 부분이었습니다. 고유키는 순차적이며 중복되지 않아야 했습니다. 기존 cubrid로 운영할때는 시리얼 채번 기능이 존재하여 테이블에 독립적으로 고유값을 얻을 수 있었지만, mysql에선 불가능했습니다. 이에 `max(*)+1` 등을 사용하여 데이터를 생성하려 했으나 동시 다발적으로 요청이 들어옴에 따라 `DuplicateKeyException` 발생하였습니다. 

## Dummy Table

해당 문제를 해결한 방법이며 가장 후회하는 방식입니다. pk 하나만 존재하는 더미 테이블을 생성하며 `auto_increment`를 이용하여 값을 획득 합니다. 이후 [`LAST_INSERT_ID()`](https://dev.mysql.com/doc/refman/8.0/en/information-functions.html#function_last-insert-id) 를 통해 커넥션별로 고유한 값을 얻어 올 수 있습니다. 

mybatis를 사용한다면 아래와 같이 사용합니다.
```xml
<insert id="insertDummyTable">
    INSERT INTO dummy_table values (default)
    <selectKey keyProperty="id" resultType="int" order="AFTER">
        SELECT LAST_INSERT_ID()
    </selectKey>
</insert>
```

일정상의 이유와 경험부족으로 인해 위와 같은 방식으로 처리하였습니다. 향후 생성될 데이터의 양을 예측하였을때 10년 이상은 문제가 없을거라 생각했지만 곱씹을수록 아쉬움이 많이 남는 방식인 것 같습니다.

## UUID
application에서 고유값을 얻는 방법입니다. UUID는 Universally Unique IDentifier의 약자이며 네트워크 상에서 고유 id를 보장하기 위한 규약입니다. 128비트의 숫자이며 8-4-4-4-12 글자마다 하이픈을 집어넣어 5개의 그룹으로 표현합니다. 생성 규칙에 따라 4가지 버전이 존재하며 MAC주소를 이용하기에 해쉬 충돌이 발생한 가능성은 겨우 10억분의 1<sub>(버전4 기준)</sub> 입니다.

```java
var uuid = UUID.randomUUID().toString(); // 4717170d-8a5e-4310-bfcc-609649fdc666
BigInteger bigInteger = 
  new BigInteger(uuid.replace("-", ""), 16); //4717170d8a5e4310bfcc609649fdc666
System.out.println(bigInteger); // 94495078096685211775394821825447708262
```

spring을 사용한다면 혹시 모를 상황(10억분의 1...)을 대비하여 [spring-retry](https://docs.spring.io/spring-batch/docs/current/reference/html/retry.html)를 적용해보는 것도 좋습니다.

```java
public interface MyService{
  @Retryable(value = DuplicatekeyException.class)
  void addUniqueValue(Model model)
}
```

기존에 생성된 데이터가 해당 숫자와 충돌할 가능성을 생각하여 반려하였습니다만, 처음부터 설계 했더라면 UUID 도입을 적극 고려했을 것 같습니다.

## Redis 

In-Memory DB인 redis를 이용하는 방식입니다. 2가지 정도의 방식이 있습니다.

### INCR Key

redis는 싱글쓰레드 기반이며 모든 명령어는 queue에 담겨 순차적으로 진행됩니다. `INCR` 명령어 사용시 atomic value 여부를 고민할 필요가 없습니다. 자세한 사용법은 [레디스_공식_문서](https://redis.io/commands/incr/)를 참고합니다.

```bash
127.0.0.1:6379> set unique_key 0
OK
127.0.0.1:6379> get unique_key
"0"
127.0.0.1:6379> incr unique_key
(integer) 1
127.0.0.1:6379> incr unique_key
(integer) 2
```

spring에서 `redisTemplate`를 사용한다면 아래와 같이 작성합니다.
```java
long uniqueKey = redisTemplate.opsForValue().increment("unique_key");
```

### Redisson

간단하게 key를 얻는것이 아니라 lock 자체를 획득해야 한다면 `redssion`을 고려해보는 것도 좋은 방법입니다.
redisson은 java 기반의 구현체이며 transaction, lock 등을 제공합니다. 추가적으로 `pub/sub` 방식으로 lock을 획득하기에 성능상의 이점 또한 가져올 수 있습니다.

```java
RedissonClient redissonClient = new RedissonClient();
String key = "unique_key";
RLock rLock = redissonClient.getLock(key);
try {
  if (rLock.tryLock(1000, 2000, TimeUnit.SECONDS)) { // ... (1)
      RTransaction rTransaction =
          redissonClient.createTransaction(TransactionOptions.defaults().timeout(1000, SECONDS));
      // doSomething()       // ... (2)
      rTransaction.commit(); // ... (3)
  }
} finally {
    rLock.unlock(); // ... (4)
}
```
- (1): timeout을 지정하지 않으면 무한루프 발생할 수 있음
- (2): 비즈니스 로직을 작성
- (3): commit을 해야 해당 내용을 반영할 수 있음
- (4): lock을 반납하지 않으면 dead-lock 발생 할 수 있음

lock 획득시 주의사항을 반드시 지켜야 하며 혹시라도 redis서버가 다운됐을시의 전략 또한 중요합니다.

## MySQL
redis를 사용한다면 위와 같은 방식으로 간편하게 처리 할 수 있지만, 비용상의 문제등으로 새롭게 서버를 추가할 수 없다면 MySQL의 user level lock을 활용하는 것도 하나의 방법입니다. [user_level_lock](https://dev.mysql.com/doc/refman/5.7/en/locking-functions.html)을 사용하면 keyword을 사용하여 락의 획득이 가능합니다.

```java
Class.forName("com.mysql.cj.jdbc.Driver");
Connection connection = DriverManager.getConnection(url, id, passwd);
Statement statement = connection.createStatement();

ResultSet resultSet = statement.executeQuery("SELECT GET_LOCK('unique', 3)");
//doSomenthing()
statement.execute("SELECT RELEASE_LOCK('unique')");
```

주의 할 점은 반드시 `RELEASE_LOCK` 을 호출해야 한다는 점 입니다. 만약 호출하지 않고 connection을 끊거나 thread 종료시 `kill` 명령어등을 사용하여 해당 락을 직접 제거 해야 합니다. 따라서 spring이나 dbcp 등 에서 사용할 경우 exception 발생시에 해당 connection에서 RELEASE_LOCK 을 호출하도록 작성합니다.

### JdbcLockRegistry
spring을 사용한다면 [`JdbcLockRegistry`](https://docs.spring.io/spring-integration/reference/html/jdbc.html#jdbc-lock-registry)사용도 고려해봄직 합니다. spring-integration의 하위 모듈로 간편하게 lock을 획득할 수 있으며 기존의 선언적 트랜잭션(@Transactional) 또한 지원 합니다.

사용하는 [datasource](https://github.com/spring-projects/spring-integration/tree/v5.3.0.RELEASE/spring-integration-jdbc/src/main/resources/org/springframework/integration/jdbc)에 맞춰 table을 생성합니다.

```gradle
dependencies {
  ...
  implementation 'org.springframework.boot:spring-boot-starter-integration'
  implementation 'org.springframework.integration:spring-integration-jdbc'
  implementation 'org.springframework.integration:spring-integration-core'
  ...
}
```

관련 라이브러를 추가합니다.

```java
@Bean
public LockRepository lockRepository(DataSource datasource) {
    return new DefaultLockRepository(datasource);
}

@Bean
public JdbcLockRegistry jdbcLockRegistry(LockRepository repository) {
    return new JdbcLockRegistry(repository);
}
```

bean을 등록합니다.


```java
@Autowired
private JdbcLockRegistry lockRegistry;

@Transactional
public void uniqueJob() throws InterruptedException {
    String key = "unique";
    Lock lock = lockRegistry.obtain(key);
    try {
        if (lock.tryLock(5, TimeUnit.SECONDS)) { // ... (1)
          // doSomething() ... (2)
        }
    } finally {
        lock.unlock(); // ... (3)
    }
}
```

- (1): 해당 시간동안 대기 후 lock 미 획득시 `InterruptedException` 발생
- (2): 비즈니스 로직 수행
- (3): lock 해제

## 참고
- [하이퍼커넥트_Redisson_사용기](https://hyperconnect.github.io/2019/11/15/redis-distributed-lock-1.html)
- [우아한형제들_user_level_lock_사용기](https://techblog.woowahan.com/2631/)
