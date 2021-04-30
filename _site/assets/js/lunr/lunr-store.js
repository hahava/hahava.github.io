var store = [{
        "title": "2020.03.30-개발일지",
        "excerpt":"System stream 객체를 close() 했을 때 발생하는 문제점 리팩토링하면서 가장 먼저 눈에 띄는것은 Scanner와 System.out.println 이었습니다. 주로 Web MVC로 개발하다 보니 콘솔 환경에서 입.출력을 구현할 일도 없거니와, 만약 구현한다 해도 Logger를 이용했기 때문입니다. 더욱이 알고리즘등을 공부하면서 일반적인 입출력보다 속도나 성능면에서 문제가 있는 것을 알고 있는데, 개선하지 않는 것은 안 좋은...","categories": ["dev_log"],
        "tags": ["dev_log","java"],
        "url": "http://localhost:4000/dev_log/devlog-20200330/",
        "teaser": null
      },{
        "title": "kotlin study day.1",
        "excerpt":"Functions Entry Poin kotlin 애플리케이션은 main 함수에서 시작합니다. fun main(){ println(\"hello world\") } Funtion kotiln 에서 함수 선언은 fun 키워드를 사용합니다. fun double(x: Int): Int{ return 2 * x } val result = double(2) parameter 함수의 매개변수는 와 반환 값은 : 를 이용하여 타입을 지정합니다. 만약 반환값으로 : 를 지정하지...","categories": ["kotlin"],
        "tags": ["kotlin"],
        "url": "http://localhost:4000/kotlin/kotlin-day1/",
        "teaser": null
      },{
        "title": "kotlin study day.2",
        "excerpt":"Variables kotlin은 java의 멤버 변수를 properties로 명명합니다. properties는 멤버변수와 비슷하게 작동하지만 일부의 차이점이 있습니다. 특징은 아래와 같습니다. 타입추론 var a = \"1234\" // 타입을 지정하지 않아도 String으로 작동 // var a; -&gt; error var b: String = \"12345\" var c: String c = \"12345\" 변수 선언 및 할당시 kotlin에서는 타입...","categories": ["kotlin"],
        "tags": ["kotlin"],
        "url": "http://localhost:4000/kotlin/kotlin-day2/",
        "teaser": null
      },{
        "title": "2020.04.06-개발일지",
        "excerpt":"어떻게 하면 switch 지옥에서 벗어날 수 있을까? 사용자의 입력을 직접적으로 받아야 하기에 다른 대학생들이 하듯 자연스럽게 switch 문을 사용해서 구현했습니다. 문제는 case가 너무 많아 수정하기 어렵고 가독성 또한 많이 떨어진다는 점 입니다. /// case 1: MyuserDAO myuserDAO = MyuserDAO.getInstance(); myuserDAO.list(); break; case 2: MovieDAO movieDAO = MovieDAO.getInstance(); movieDAO.movieMenu(); break; case...","categories": ["dev_log"],
        "tags": ["dev_log","java"],
        "url": "http://localhost:4000/dev_log/devlog-20200406/",
        "teaser": null
      },{
        "title": "jenv 환경설정",
        "excerpt":"개발 또는 운영할때 여러가지의 java 버전을 사용해야 하는 경우가 있습니다. python의 venv 같은 것이 없을까 찾아보던중 jenv 를 알게되어 관련 내용을 정리합니다. Installation Mac OS X $ brew install jenv Mac os 에서는 기본적으로 homebrew 를 통해 설치할 수 있습니다. Bash $ echo 'export PATH=\"$HOME/.jenv/bin:$PATH\"' &gt;&gt; ~/.bash_profile $ echo 'eval...","categories": ["env"],
        "tags": ["java"],
        "url": "http://localhost:4000/env/jenv/",
        "teaser": null
      },{
        "title": "2020.04.16-개발일지",
        "excerpt":"클린 코드를 다시 읽던 중, 8장 ‘경계’ 에서 ‘학습 테스트는 공짜 이상이다 라는 주제가 많은 공감이 되었습니다. ··· 학습 테스트는공짜 이상이다. 투자하는 노력보다 성과가 크다. 패키지 새 버전이 나온다면 학습 테스트를 돌려 차이가 있는지 확인한다. ··· 일단 통합한 이후라고 하더라도 패키지가 우리 코드와 호환되라라는 보장은 없다. 패키지 작성자에게 코드를 변경할...","categories": ["dev_log"],
        "tags": ["dev_log","java"],
        "url": "http://localhost:4000/dev_log/devlog-20200416/",
        "teaser": null
      },{
        "title": "docker study 01",
        "excerpt":"Docker 는 … Docker란 컨테이너형 가상화 기술을 구현하기 위한 상주 애플리케이션과 이 애플리케이션을 조작하기 위한 도구입니다. 애플리케이션 배포에 특화되어 있기 때문에 애플리케이션 개발 및 운영을 컨테이너 중심으로 할 수 있습니. 로컬환경에 도커만 설치하면 몇 줄짜리 구성 파일과 명령어 한줄로 애플리케이션이나 미들웨어가 이미 갖춰진 테스트용 가상환경을 빠르게 구축 할 수 있습니다....","categories": ["docker"],
        "tags": ["docker"],
        "url": "http://localhost:4000/docker/docker_study_01/",
        "teaser": null
      },{
        "title": "docker study 02",
        "excerpt":"컨테이너와 이미지 도커 이미지 : 도커 컨테이너를 구성하는 파일 시스템과 실행할 애플리케이션 설정을 하나로 합친 것으로, 컨테이너를 생성하는 템플릿 역할을 합니다. 도커 컨테이너 : 도커 이미지를 기반으로 생성되며, 파일 시스템과 애플리케이션이 구체화돼 실행되는 상태. (일종의 인스턴스라고 보면 됩니다.) 도커 이미지 하나로 여래개의 컨테이너를 생성 할 수 있습니다. DockerFile DockerFile 은...","categories": ["docker"],
        "tags": ["docker"],
        "url": "http://localhost:4000/docker/docker_study_02/",
        "teaser": null
      },{
        "title": "maven profile 설정하기",
        "excerpt":"실무에서 개발과 운영 환경은 다를 겁니다. 누구도 테스트나 개발하는 환경에서 실제 데이터 베이스 또는 서버의 URL 등을 사용하지 않을 것 입니다. 만약, 환경이 변할때마다 일일히 코드 수정을 한다면 그것은 매우 비효율적이며 때때로 휴먼 버그를 낳을 것입니다. 이럴때 필요한 방법이 profile 입니다. Maven profile 프로파일 설정은 pom.xml 에 아래와 같은 형태로...","categories": ["env"],
        "tags": [],
        "url": "http://localhost:4000/env/maven_profile-20200608/",
        "teaser": null
      },{
        "title": "http status code 정리",
        "excerpt":"http status code  는 http 요청의 성공여부를 가르킵니다. 5개의 그룹으로 분류되어 있으며, 각각의 설명은 아래와 같습니다.      Informational responses (100–199),   Successful responses (200–299),   Redirects (300–399),   Client errors (400–499),   and Server errors (500–599)   Informational responses   ","categories": ["http"],
        "tags": [],
        "url": "http://localhost:4000/http/spring_validator/",
        "teaser": null
      },{
        "title": "kotlin study day3",
        "excerpt":"예외처리 kotlin의 예외처리 방식은 java 와 매우 유사합니다. 예외를 던지는 방법은 throw 키워드를 사용하며, new 를 사용하지 않습니다. val input = \"10\" if (input is String) {    throw TypeCastException(\"Not allowed string.\") } /// val stream try { stream = connection.inputStream()  stream.read() } catch (e: StreamCorruptedException){  stream = null }...","categories": ["kotlin"],
        "tags": [],
        "url": "http://localhost:4000/kotlin/kotlin-day3/",
        "teaser": null
      },{
        "title": "2021.04.30-개발일지",
        "excerpt":"회사에서 업무중 ie11에서 정상적으로 로직이 처리되지 않는다는 연락을 받았습니다. chrome에선 정상적으로 실행됐기에 단순히 폴리필 문제라고 생각했지만, 이미 babel 정상적으로 작동되고 있었습니다. 혹시나 싶어 해당 기능을 safari에서 테스트 해본결과 동일한 문제가 발생하여 라인별 로깅을 통해 문제를 파악하였습니다. 브라우저별 date 처리 방식 확인결과 서버에서 전송한 날짜를 비교할때 chrome과 다른 브라우저간의 처리방식에 있어...","categories": ["dev_log"],
        "tags": [],
        "url": "http://localhost:4000/dev_log/js-compatibility-for-date/",
        "teaser": null
      }]
