---
title: "Elasticsearch popular keyword"

categories:
 - dev_log
---

Elasticsearch 에서 인기검색어를 구현하는 내용을 정리합니다.

## Aggregation
Elasticsearch에선 Aggregation 즉 집계 관련 기능을 자체적으로 제공합니다. aggregation에는 metric, bucket등이 존재하며 이것들을 확장하여 sub, pipeline 형태 등으로 사용합니다.

### Request
```json
{
  "query": {
    "constant_score": {
      "filter": {
        "match": { "type": "hat" }
      }
    }
  },
  "aggs": {
    "hat_prices": { "sum": { "field": "price" } }
  }
}
```

위와 같은 형태로 사용합니다.
- (1): aggregation의 진입점 
- (2): aggregation의 이름을 정의
- (3): 집계 방식을 의미하여 종류별로 다르게 사용
    - metric: stats, cardinality
    - bucket: range, histogram, terms


### Response
```json
{
  "aggregations": {
    "hat_prices": {
      "value": 450.0
    }
  }
}
```

## 인기검색어
Aggregation중 terms을 이용하면 query에 해당하는 결과를 bucket으로 구분할 수 있습니다. 이것은 SQL group by와 비슷하게 작동합니다.

### sample data
```json
PUT _bulk

{"index":{"_index":"search_log", "_id":"1"}}
{"query":"삼성전자"}
{"index":{"_index":"search_log", "_id":"2"}}
{"query":"삼성전자"}
{"index":{"_index":"search_log", "_id":"3"}}
{"query":"삼성전자"}
{"index":{"_index":"search_log", "_id":"4"}}
{"query":"네이버"}
{"index":{"_index":"search_log", "_id":"5"}}
{"query":"네이버"}
{"index":{"_index":"search_log", "_id":"6"}}
{"query":"카카오"}
{"index":{"_index":"search_log", "_id":"7"}}
{"query":"두나무"}
```

사용자가 검색하는 키워드를 기록하는 데이터 예시 입니다.

### Request
```json
GET /search_log/_search

{
    "aggs": {
        "popular_keywords": {
            "terms": {
                "field": "query.keyword" // ... (1)
            }
        }
    }
}
```
- (1): aggregation의 사용하는 데이터는 반드시 `keyword`타입이어야 합니다.

### Response
```json
{
    // 생략 //
    "aggregations": {
        "popular_keywords": { // ... (1)
            "doc_count_error_upper_bound": 0,
            "sum_other_doc_count": 0,
            "buckets": [
                {
                    "key": "삼성전자",
                    "doc_count": 3
                },
                {
                    "key": "네이버",
                    "doc_count": 2
                },
                {
                    "key": "두나무",
                    "doc_count": 1
                },
                {
                    "key": "카카오",
                    "doc_count": 1
                }
            ]
        }
    }
}
```

- (1): request에 정의된 이름을 key로 정의하여 결과를 반환합니다.

주의점은 terms aggregation의 경우 추정치로 사용해야지 정확한 수치를 사용하는데 사용해선 안된다는 점 입니다. 이 내용을 이해하기 위해선 elasticsearch의 데이터 관리 그리고 aggregation에 대한 메커니즘을 일부 인지해야 합니다. 

Elasticsearch는 index를 [shard](https://www.elastic.co/kr/blog/every-shard-deserves-a-home)로 관리합니다. 그리고 모든 데이터는 shard별로 분배되어 저장됩니다.

<img src="{{site.baseurl}}/assets/img/elasticsearch_shard.png">

terms 쿼리는 shard별 상위 키워드를 가져오며 경우에 따라 부정확한 정보를 가져올 수 있습니다. 

|shard|keyword|count|
|---|----|---|
|node-1|삼성전자|10|
|node-1|네이버|8|
|node-1|카카오|7|
|node-2|카카오|7|
|node-2|네이버|8|
|node-2|삼성전자|4|

극단적인 상황을 가정하여 이와 같이 데이터가 저장되어있는 경우 `shard_size`를 2로 지정했을때 terms aggregation결과는 아래와 같이 보여질 것 입니다.

```json
{
    "aggregations": {
        "popular_keywords": {
            "doc_count_error_upper_bound": 0,
            "sum_other_doc_count": 0,
            "buckets": [
                {
                    "key": "네이버",
                    "doc_count": 16
                },
                {
                    "key": "삼성전자",
                    "doc_count": 10
                }
            ]
        }
    }
}
```
`node-1`의 카카오와 `node-2`의 삼성전자는 무시되어 최종 결과를 신뢰할 수 없게 됩니다.

이러한 문제를 방지하기 위해 `shard_size`를 증가해야 하지만, scan 횟수가 많아지기에 성능 문제를 야기할 수 있습니다.

## 인기검색어 튜닝하기
terms를 이용하여 인기검색어를 구현했지만, 바로 사용하기에는 현실적인 문제가 존재합니다. 서비스나 산업별로 다를 수 있지만 인기검색어는 대부분 동일한 값이 노출될 것이며 이것은 사용자에게 풍부한 경험을 제공하기 어렵습니다. 예를 들어 증권사의 경우 삼성전자가 포털의 경우는 날짜 같은 키워드가 이에 해당할 가능성이 높습니다.

SQL을 사용했다면 `subquery`, `join`, `group by`등을 조합하여 이것을 구분할 수 있겠지만, Elasticsearch에선 제공하지 않기에 해당 방식으로 처리할 순 없을 것입니다. application에서 처리하는 방법도 있지만 키워드의 개수가 증가할수록 메모리에 올려둘 수 있는 데이터의 양이 제한될 수밖에 없을 것입니다.

그러나 약간의 트릭을 이용하여 해결할 수 있는데, 바로 sub-aggregation 과 script를 이용한 sum aggregation입니다.

### sample data
```json
{"index":{"_index":"search_log", "_id":"1"}}
{"keyword":"삼성전자", "value": "1"}
{"index":{"_index":"search_log", "_id":"2"}}
{"keyword":"삼성전자", "value": "1"}
{"index":{"_index":"search_log", "_id":"3"}}
{"keyword":"삼성전자", "value": "1"}
{"index":{"_index":"search_log", "_id":"4"}}
{"keyword":"네이버", "value": "1"}
{"index":{"_index":"search_log", "_id":"5"}}
{"keyword":"네이버", "value": "1"}
{"index":{"_index":"search_log", "_id":"6"}}
{"keyword":"카카오", "value": "1"}
{"index":{"_index":"search_log", "_id":"7"}}
{"keyword":"두나무", "value": "1"}
```

기존과 달리진점은 `value` field가 추가되었단 점 입니다. 

### Request
```json
GET /search_log/_search

{
    "aggs": {
        "popular_keyword": {
            "terms": {
                "field": "query.keyword", 
                "order": {  //...(3)
                    "total": "desc"
                }
            },
            "aggs": {
                "total": {
                    "sum": {
                        "field": "value", //...(1)
                        "script": 
                            "if(doc['query.keyword'].value == '삼성전자') return 0.5; else return 1" //...(2)
                    }
                }
            }
        }
    }
}
```
- (1): value필드를 상수로 활용
- (2): script를 통해 일종의 boost를 구현
- (3): 정렬방식을 sub-aggregation의 `sum`값으로 순위를 구현


`script`와 `sub-aggregation`은 반드시 병목 지점을 야기하기에 해당 쿼리를 실시간 API 용도로 사용하지 않고 배치작업등을 통해 캐싱하는 것을 추천합니다.