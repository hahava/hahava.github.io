---
title: "docker study 02"
excerpt: "container로 애플리케이션 실행하기"

categories:
 - study
tags:
 - docker

---



## 컨테이너와 이미지

- 도커 이미지 : 도커 컨테이너를 구성하는 파일 시스템과 실행할 애플리케이션 설정을 하나로 합친 것으로, 컨테이너를 생성하는 템플릿 역할을 합니다.

- 도커 컨테이너 : 도커 이미지를 기반으로 생성되며, 파일 시스템과 애플리케이션이 구체화돼 실행되는 상태.
  (일종의 인스턴스라고 보면 됩니다.)

도커 이미지 하나로 여래개의 컨테이너를 생성 할 수 있습니다.



## DockerFile

`DockerFile` 은 도커에서 이미지를 빌드하여 컨테이너를 만들어주는 일종의 명령어(instructions) 집합입니다. `docker build ` 명령어를 입력시 DockerFile의 명령어를 실행하여 이미지를 빌드합니다. `DockerFile` 의 형태 및 사용방법은 아래와 같습니다. (간단하게 node-express를 도커로 띄우는 방법)



**DokcerFIle 예시**

```bash
FROM node

WORKDIR /app

COPY ./* /app/

RUN npm install

CMD ["node", "index.js"]
```



`FROM` 은 도커 이미지의 바탕이 될 베이스 이미지를 지정합니다. FROM에서 받아오는 도커 이미지는 도커 허브(Docker Hub)라는 레지스트리에 공개된 것입니다. 위 예제에선 `node ` 를 실행하기 위해 라이브러리를 추가하였습니다.

`WORKDIR` 은 작업 디렉터리를 지정합니다. 지정 후 모든 명령어는 작업 디렉터리를 기준으로 실행됩니다.

`RUN` 은 도커 이미지를 실행할 때, 컨테이너 안에서 실행할 명령을 정의하는 인스트럭션입니다. 위 예제에선 npm 패키지를 설치하였습니다.

`COPY` 는 도커가 동작중인 호스트 머신의 파일이나 디렉터리를 도커 컨테이너 안으로 복사합니다. 예제에선 `package.json`   파일과 `index.js` 파일을  컨테이너 안에서 실행 할 수 있도록 복사하였습니다.

`CMD` 는 도커 컨테이너를 실행 할 때 컨테이너 안에서 실행할 프로세스를 지정합니다. 컨테이너를 시작할 때 한번 실행됩니다. 쉘 스크립트로 치면 다음과 같은 실행 명령 역할을 합니다.



**index.js**

```javascript
const express = require('express')

const PORT = 3000;

const app = express();
app.get("/", (req, res) =>{
	res.send("hello world")
});

app.listen(PORT);
console.log("server is started..!")
```



**package.json**

```json
{
  "name": "hahava-express",
  "version": "1.0.0",
  "description": "docker study ",
  "main": "index.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "author": "",
  "license": "ISC",
  "dependencies": {
    "express": "4.17.1",
  }
}
```



## 도커 이미지 빌드하기

`DockerFile` 의 작성이 끝났으면, docker image build 명령으로 도커 이미지를 빌드합니다. 

```bash
$ docker image build -t hahava/express-server:0.0.1 .
# docker image build -t 이미지명:태그명 DokcerFile 경로
```

-t 옵션으로 이미지명을 지정할 수 있습니다. 태그명도 지정할 수 있으며, 생략시에는 latest가 붙습니다. 빌드된 이미지는 기본적으로 해쉬 값을 통해 구분됩니다. 그러기에 이미지 또는 태그명을 설정하는게 좋습니다.

생성 후에는 아래 명령어를 통해 빌드되어 도커 데몬에 의해 관리되는 이미지 목록들을 확인 할 수 있습니다.

```bash
$ docker image ls
REPOSITORY          TAG                 IMAGE ID            CREATED             SIZE
log                 0.0.1               5ecb42470501        2 minutes ago       943MB
node                latest              625525d94501        33 hours ago        943MB
```

- REPOSITORY: github 저장소처럼 '소유자명/애플리케이션명' 과 같이 이름이 붙는다.
- TAG: 특정 이미지를 식별하기 위한 값
- IMAGE ID: 이미지를 유일하게 식별하기 위한 식별자. 태그가 다른 같은 이미지가 여러개 존재할 수 있다.
  (build시에 태그를 달리 붙인다면)
- CREATED: 생성 후 경과 시간
- SIZE: 이미지 파일 크기



## 도커 컨테이너 실행하기

생성된 이미지를 컨테이너로 실행할 수 있습니다.

```bash
$  docker container run -d -p 9000:3000 hahava-server:0.0.1
```

-d 옵션을 붙여 백그라운드로 실행 할 수 있습니다. -p 옵션은 포트포워딩을 제공합니다.

```bash
$ docker container ls
CONTAINER ID        IMAGE                 COMMAND                  CREATED             STATUS              PORTS                    NAMES
063ae7ccd719        hahava-server:0.0.1   "docker-entrypoint.s…"   6 seconds ago       Up 6 seconds        0.0.0.0:9000->3000/tcp   brave_cohen

$ docker container stop 063ae7ccd719
063ae7ccd719
```

docker image 명령과 마찬가지로 `ls`  현재 실행중인 컨테이너를 확인할 수 있으며, `stop` 를 통해 실행중인 컨테이너를 종료 할 수 있습니다.



```ba
$ wget localhost:9000
# hello world
```



## Docker Container Life Cycle

도커 컨테이너는 `실행중`, `정지`,` 파기` 등 3가지 상태를 갖습니다. docker container run 명령으로 컨테이너를 최초 실행한 시점의 상태는 실행중 입니다. <u>각 컨테이너는 동일한 이미지로 생성했다 하더라도 별개의 상태를 갖습니다.</u>



실행 중 상태에 있는 컨테이너가 어떠한 방식으로도 종료된다면 컨테이너는 자동으로 정지 상태가 됩니다. (사용자가 명시적으로 종료 하던, 오류 발생으로 강제 종료되던지) 컨테이너를 정지시키면 가상 환경으로서는 더 이상 작동하지는 않지만, 디스크에 상태가 저장됩니다. 그러므로, 정지시킨 컨테이너는 언제든지 다시 실행할 수 있습니다.



정지 상태의 컨테이너는 파기하지 않는 이상 디스크에 그대로 남아 있습니다.(운영 체제를 종료한다 해도) 컨테이너를 자주 생성하고 정지해야 하는 상황에서는 디스크를 차지하는 용량이 점점 늘어나므로 불필요한 컨테이너를 완전히 삭제하는 것이 바람직합니다. <u>한번 파기한 컨테이너는 다시는 실행할 수 없습니다.</u>



## Docker Hub

Docker hub는 git hub과 마찬가지로 도커 이미지를 관리할 수 있는 저장소의 일종입니다. Docker hub에는 수많은 저장소가 있습니다. 덕분에 직접생성하지 않고 만들어 둔 이미지를 사용할 수 있습니다.



```bash
$docker search --limit 5 mysql
NAME                  DESCRIPTION                                     STARS               OFFICIAL            AUTOMATED
mysql                 MySQL is a widely used, open-source relation…   9375                [OK]
mysql/mysql-server    Optimized MySQL Server Docker images. Create…   687                                     [OK]
mysql/mysql-cluster   Experimental MySQL Cluster Docker images. Cr…   66
bitnami/mysql         Bitnami MySQL Docker Image                      38                                      [OK]
circleci/mysql        MySQL is a widely used, open-source relation…   19
```

`docker search` 명령어를 이용하여 docker hub에 저장된 이미지를 검색할 수 있습니다. 이때 `OFFICIAL` 항목이 OK 인 저장소는 개발사가 직접 생생해 둔 것입니다.



**dokcer image pull**

도커 레지스트리에서 이미지를 내려받으려면 docker image pull 명령어를 사용합니다.

```bash
$ docker image pull [option] 레포지토리명[:태그명]
```

인자로 지정한 레포지토리명과 태그는 도커허브에 이미지 존재해야 하는 값입니다. 만약, 태그명을 생략하면 기본값으로 지정된 태그가 적용됩니다.



**docker image push**

현재 저장된 이미지를 도커 허브의 레지스트리에 등록할 수 있습니다.

```bash
$ docker image push [options] 레포지토리명[:태그]
```



