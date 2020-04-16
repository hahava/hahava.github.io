var store = [{
        "title": "2020.03.30-개발일지",
        "excerpt":"System stream 객체를 close() 했을 때 발생하는 문제점 리팩토링하면서 가장 먼저 눈에 띄는것은 Scanner와 System.out.println 이었습니다. 주로 Web MVC로 개발하다 보니 콘솔 환경에서 입.출력을 구현할 일도 없거니와, 만약 구현한다 해도 Logger를 이용했기 때문입니다. 더욱이 알고리즘등을 공부하면서 일반적인 입출력보다 속도나 성능면에서 문제가 있는 것을 알고 있는데, 개선하지 않는 것은 안 좋은...","categories": ["dev_log"],
        "tags": ["dev_log","java"],
        "url": "http://localhost:4000/dev_log/20200330/",
        "teaser": null
      },{
        "title": "kotlin study day.1",
        "excerpt":"Functions Entry Poin kotlin 애플리케이션은 main 함수에서 시작합니다. fun main(){ println(\"hello world\") } Funtion kotiln 에서 함수 선언은 fun 키워드를 사용합니다. fun double(x: Int): Int{ return 2 * x } val result = double(2) parameter 함수의 매개변수는 와 반환 값은 : 를 이용하여 타입을 지정합니다. 만약 반환값으로 : 를 지정하지...","categories": ["study"],
        "tags": ["kotlin"],
        "url": "http://localhost:4000/study/kotlin-day1/",
        "teaser": null
      },{
        "title": "kotlin study day.2",
        "excerpt":"Variables kotlin은 java의 멤버 변수를 properties로 명명합니다. properties는 멤버변수와 비슷하게 작동하지만 일부의 차이점이 있습니다. 특징은 아래와 같습니다. 타입추론 var a = \"1234\" // 타입을 지정하지 않아도 String으로 작동 // var a; -&gt; error var b: String = \"12345\" var c: String c = \"12345\" 변수 선언 및 할당시 kotlin에서는 타입...","categories": ["study"],
        "tags": ["kotlin"],
        "url": "http://localhost:4000/study/kotlin-day2/",
        "teaser": null
      },{
        "title": "2020.04.06-개발일지",
        "excerpt":"어떻게 하면 switch 지옥에서 벗어날 수 있을까? 사용자의 입력을 직접적으로 받아야 하기에 다른 대학생들이 하듯 자연스럽게 switch 문을 사용해서 구현했습니다. 문제는 case가 너무 많아 수정하기 어렵고 가독성 또한 많이 떨어진다는 점 입니다. /// case 1: MyuserDAO myuserDAO = MyuserDAO.getInstance(); myuserDAO.list(); break; case 2: MovieDAO movieDAO = MovieDAO.getInstance(); movieDAO.movieMenu(); break; case...","categories": ["dev_log"],
        "tags": ["dev_log","java"],
        "url": "http://localhost:4000/dev_log/devlog-20200406/",
        "teaser": null
      },{
        "title": "jenv 환경설정",
        "excerpt":"개발 또는 운영할때 여러가지의 java 버전을 사용해야 하는 경우가 있습니다. python의 venv 같은 것이 없을까 찾아보던중 jenv 를 알게되어 관련 내용을 정리합니다. Installation Mac OS X $ brew install jenv Mac os 에서는 기본적으로 homebrew 를 통해 설치할 수 있습니다. Bash $ echo 'export PATH=\"$HOME/.jenv/bin:$PATH\"' &gt;&gt; ~/.bash_profile $ echo 'eval...","categories": ["post"],
        "tags": ["java"],
        "url": "http://localhost:4000/post/jenv/",
        "teaser": null
      },{
        "title": "2020.04.16-개발일지",
        "excerpt":"클린 코드를 다시 읽던 중, 8장 ‘경계’ 에서 ‘학습 테스트는 공짜 이상이다 라는 주제가 많은 공감이 되었습니다. ··· 학습 테스트는공짜 이상이다. 투자하는 노력보다 성과가 크다. 패키지 새 버전이 나온다면 학습 테스트를 돌려 차이가 있는지 확인한다. ··· 일단 통합한 이후라고 하더라도 패키지가 우리 코드와 호환되라라는 보장은 없다. 패키지 작성자에게 코드를 변경할...","categories": ["dev_log"],
        "tags": ["dev_log","java"],
        "url": "http://localhost:4000/dev_log/devlog-20200416/",
        "teaser": null
      },{
        "title": "docker study 01",
        "excerpt":"Docker 는 … Docker란 컨테이너형 가상화 기술을 구현하기 위한 상주 애플리케이션과 이 애플리케이션을 조작하기 위한 도구입니다. 애플리케이션 배포에 특화되어 있기 때문에 애플리케이션 개발 및 운영을 컨테이너 중심으로 할 수 있습니. 로컬환경에 도커만 설치하면 몇 줄짜리 구성 파일과 명령어 한줄로 애플리케이션이나 미들웨어가 이미 갖춰진 테스트용 가상환경을 빠르게 구축 할 수 있습니다....","categories": ["study"],
        "tags": ["docker"],
        "url": "http://localhost:4000/study/docker_study_01/",
        "teaser": null
      }]
