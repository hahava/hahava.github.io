---
title: "spring batch execution context 예외 처리하기"

categories:
 - dev_log
---
 
업무 중 batch job을 작성하다 아래와 같은 메시지가 발생하였고 이것을 해결한 내용 및 원리를 정리합니다.
```
Failed to serialize object of type: class org.springframework.batch.item.ExecutionContext
```

## Execution Context
배치 처리는 job 혹은 step별 상태를 가지고 있어야 합니다. 저장된 상태를 통해 commit등의 transaction처리를 하게 됩니다. 
다행인 점은 사용자가 직접 처리하는 것이 아니라 spring이 알아서 자동화해준다는 점 입니다. `Executioncontext`가 그 역할을 처리하며 내부적으로 key, value 형태로 되어 있습니다. `ExecutionContext`는 단순히 spring 내부에서 그 과정을 제어하는 수준을 넘어서 global하게 영역별 데이터를 사용자가 직접 공유도 할 수 있도록 도와줍니다. 하기 코드는 tasklet에서 `Executioncontext`에 접근하는 예제입니다.

```kotlin
data class Person(
    val name: String,
    val age: Int
)

class FirstTasklet : Tasklet {
    override fun execute(stepContribution: StepContribution, chunkContext: ChunkContext): RepeatStatus {
        val jobContext = chunkContext.stepContext.stepExecution.executionContext
        jobContext.put("key", Person("hahava", 31))
        return RepeatStatus.FINISHED
    }
}
```

언급한 바와 같이 `Executioncontext`는 내부가 ConcurrentHashmap으로 구현되어 있기에 `get`메서드를 호출하여 데이터를 안전하게 가져올 수 있습니다.

```kotlin
class SecondTasklet : Tasklet {
    override fun execute(stepContribution: StepContribution, chunkContext: ChunkContext): RepeatStatus {
        val jobContext = chunkContext.stepContext.stepExecution.jobExecution.executionContext
        println(jobContext.get("key"))

        return RepeatStatus.FINISHED
    }
}
```

그러나 회사에서 작업할 때는 예외가 발생하였습니다. 
```
Failed to serialize object of type: class org.springframework.batch.item.ExecutionContext
```

## DefaultBatchConfigurer 
`@EnableBatchProcessing`을 통해 간편하게 batch를 사용할 수 있습니다. 내부적으로 `DefaultBatchConfigurer`사용하며 서비스나 경우에 맞춰 특정 설정 등을 override하여 구현합니다. 일부 시스템에선 데이터베이스를 지정하지 않고 batch를 작업하기 위해 아래와 같이 `setDatasource`를 override하여 공백으로 지정합니다.

```kotlin
@SpringBootApplication
@EnableBatchProcessing
@Configuration
class DemoApplication : DefaultBatchConfigurer() {
    override fun setDataSource(dataSource: DataSource) {
    }
}
```

문제는 datasource를 null로 처리했을 경우 `initialize`에서 기대하는 동작이 일부 달라진다는 점입니다.

```java
@PostConstruct
public void initialize() {
  try {
    if(dataSource == null) {
      logger.warn("No datasource was provided...using a Map based JobRepository");

      if(getTransactionManager() == null) {
        logger.warn("No transaction manager was provided, using a ResourcelessTransactionManager");
        this.transactionManager = new ResourcelessTransactionManager();
      }

      MapJobRepositoryFactoryBean jobRepositoryFactory = new MapJobRepositoryFactoryBean(getTransactionManager());
      jobRepositoryFactory.afterPropertiesSet();
      this.jobRepository = jobRepositoryFactory.getObject(); // ...(1)

      MapJobExplorerFactoryBean jobExplorerFactory = new MapJobExplorerFactoryBean(jobRepositoryFactory);
      jobExplorerFactory.afterPropertiesSet();
      this.jobExplorer = jobExplorerFactory.getObject(); 
    } else {
      this.jobRepository = createJobRepository(); 
      this.jobExplorer = createJobExplorer(); // ... (2)
    }

    this.jobLauncher = createJobLauncher();
  } catch (Exception e) {
    throw new BatchConfigurationException(e);
  }
}
```

(2)와 같이 호출되면 `JobExplorerFactoryBean`가 생성되고 내부에 `ExecutionContextSerializer` 구현되어 있어 추가적이 작업을 하지 않아도 되지만, (1)과 같이 호출되면 `MapJobExecutionDao` 생성되고 `org.springframework.util`패키지의 `SerializationUtils`호출 합니다. `SerializationUtils`은 `Serializable`을 사용하기 때문에 `Serializable`구현하지 않은 클래스에선 예외가 발생했던 것입니다. 따라서 기본 타입이 아닌 클래스 타입에선 반드시 `Serializable` 구현해야 정상적으로 context을 사용할 수 있습니다. 


**full code**


```kotlin
@Configuration
class JobConfig(
    private val jobBuilderFactory: JobBuilderFactory,
    private val stepBuilderFactory: StepBuilderFactory
) {
    @Bean
    fun sampleJob(): Job = jobBuilderFactory.get("sampleJob")
        .start(firstStep()).next(secondStep())
        .build()

    @Bean
    fun firstStep(): Step = stepBuilderFactory.get("firstStep")
        .tasklet(firstTasklet())
        .build()

    @Bean
    fun secondStep(): Step = stepBuilderFactory.get("secondStep")
        .tasklet(secondTasklet())
        .build()

    @Bean
    fun firstTasklet() = FirstTasklet()

    @Bean
    fun secondTasklet() = SecondTasklet()
}

class FirstTasklet : Tasklet {
    override fun execute(stepContribution: StepContribution, chunkContext: ChunkContext): RepeatStatus {
        val jobContext = chunkContext.stepContext.stepExecution.executionContext
        jobContext.put("key", Person("hahava", 31))
        return RepeatStatus.FINISHED
    }
}

class SecondTasklet : Tasklet {
    override fun execute(stepContribution: StepContribution, chunkContext: ChunkContext): RepeatStatus {
        val jobContext = chunkContext.stepContext.stepExecution.jobExecution.executionContext
        println(jobContext.get("key"))

        return RepeatStatus.FINISHED
    }
}

data class Person(
    val name: String,
    val age: Int
) : Serializable
``` 