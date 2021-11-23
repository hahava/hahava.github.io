---
title: "mysql 중복키 삽입 처리"
categories:
 - database
---

서비스의 경우에 따라 데이터의 중복여부를 확인후 삽입해야 하는 경우가 있습니다. 애플리케이션의 비즈니스 로직에서 조회 후 처리할 수 있지만, 배치등의 처리를 할 때에는 데이터를 조회하거나 drop하는 것이 부담 될 수 있습니다. 이러한 상황에서 중복키가 존재하는 데이터의 삽입을 처리하는 방법을 정리합니다.

### setup
```sql
DROP TABLE IF EXISTS MEMBER;
CREATE TABLE MEMBER(
  ID INT AUTO_INCREMENT PRIMARY KEY,
  NAME VARCHAR(30) NOT NULL UNIQUE,
  AGE INT CHECK (0 < AGE  AND AGE < 100)
);
```

테이블을 위와 같은 형태로 정의합니다. 기본적으로 `AUTO_INCREMENT`을 이용한 PK와 중복방지를 위해 `NAME` 을 `UNIQUE` 하게 설정합니다. 이후 데이터를 삽입하는 과정은 아래와 같은 형태일 것 입니다.

```sql
insert ignore into member(id, name, age) values (default, "hahava", 30);
```

### insert ignore

만약, 동일한 key가 존재할 경우 insert를 하고 싶지 않다면 `insert ignore`을 사용하여 원본 row을 유지할 수 있습니다.

```sql
INSERT IGNORE INTO MEMBER (NAME, AGE) VALUES ("hahava", 40);
```

해당 구문을 실행하면 `0 row(s) affected, 1 warning(s): 1062 Duplicate entry '1' for key 'PRIMARY'	0.00029 sec` 와 같은 에러메시지를 출력합니다. 만약, mybatis 등을 사용한다면 `LAST_INSERT_ID()`을 사용하여 `0` 인 경우 `ignore` 처리 됐음을 확인 할 수 있습니다.

### replace
`replace`명령어를 사용하면 중복되는 key와 관련된 모든 row를 변경합니다.

```sql
REPLACE INTO MEMBER (NAME, AGE) VALUES ("hahava", 40);
```

이때 주의할 점은  `delete` 후 `insert` 되기 때문에 `AUTO_INCREMENT` 사용시 id가 변경 될 수 있으며, 여러타입의 key가 중복될 경우 해당 row를 전부 삭제하고 하나의 데이터만 삽입하게 됩니다.

**쿼리 실행 전**  

|id|name|age|
|--|--|--|
|1|"hahava"|30|
|2|"hahama"|27|

```sql
REPLACE INTO MEMBER (ID, NAME, AGE) VALUES (1 ,"hahama", 40);
```

**쿼리 실행 후**

`id`와 `name` 이 겹치게 되는 row를 전부 삭제후 1건만 새롭게 추가 합니다.

|id|name|age|
|--|--|--|
|1|"hahama"|40|

### DUPLICATE ON KEY

key가 중복될시 일부분의 데이터먼 바꿀수도 있습니다.

```sql
INSERT INTO MEMBER(ID, NAME, AGE) VALUES (1, "hahava", 40)
ON DUPLICATE KEY UPDATE
AGE = 40;
```

`UPDATE` 이후 변경될 칼럼에 대한 값을 설정해주면 됩니다. `replace` 와 다른점은 `id`가 변경될 일이 없으며, 2개의 이상의 key가 중복될 경우 key의 우선순위를 부여하여 (PK > UNIQUE) [반드시 1개의 값만 변경](https://mariadb.com/kb/en/insert-on-duplicate-key-update/#description)될 수 있도록 처리합니다 . 이후 `LAST_INSERT_ID()`를 사용하여 변경된 내용을 확인할 수 있습니다.
