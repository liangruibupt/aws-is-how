## Query

```GraphQL
mutation createDataPoint($createdatapointinput: CreateDataPointInput!) {
  createDataPoint(input: $createdatapointinput) {
    name
    createdAt
    value
  }
}

query listDataPoints {
  listDataPoints(limit: 10, nextToken: null) {
    items {
      name
      createdAt
      value
    }
  }
}


query getDataPoint {
  getDataPoint(createdAt: "1970-01-02T12:30:00.000Z", name: "hello-world") {
    createdAt
    name
    value
  }
}

subscription onCreateDataPoint {
  onCreateDataPoint {
    createdAt
    name
    value
  }
}


query NewQuery {
  queryDataPointsByNameAndDateTime(name: "hello-world", createdAt: {between: ["2020", "2022"]}, limit: 10, sortDirection: DESC) {
    items {
      createdAt
      name
      value
    }
  }
}

query GetLatest {
  queryDataPointsByNameAndDateTime(name: "hello-world", limit: 3, sortDirection: DESC) {
    items {
      createdAt
      name
      value
    }
  }
}
```

## Schema
```GraphQL
input CreateDataPointInput {
	name: ID!
	createdAt: AWSDateTime
	value: Int
}

type DataPoint {
	name: ID!
	createdAt: AWSDateTime!
	value: Int
}

type DataPointConnection {
	items: [DataPoint]
	nextToken: String
}

input DeleteDataPointInput {
	name: ID!
	createdAt: AWSDateTime!
}

enum ModelSortDirection {
	ASC
	DESC
}

input ModelStringKeyConditionInput {
	eq: String
	le: String
	lt: String
	ge: String
	gt: String
	between: [String]
	beginsWith: String
}

type Mutation {
	createDataPoint(input: CreateDataPointInput!): DataPoint
	updateDataPoint(input: UpdateDataPointInput!): DataPoint
	deleteDataPoint(input: DeleteDataPointInput!): DataPoint
}

type Query {
	getDataPoint(name: ID!, createdAt: AWSDateTime!): DataPoint
	listDataPoints(filter: TableDataPointFilterInput, limit: Int, nextToken: String): DataPointConnection
	queryDataPointsByNameAndDateTime(
		name: ID!,
		createdAt: ModelStringKeyConditionInput,
		sortDirection: ModelSortDirection,
		filter: TableDataPointFilterInput,
		limit: Int,
		nextToken: String
	): DataPointConnection
}

type Subscription {
	onCreateDataPoint(name: ID, createdAt: AWSDateTime, value: Int): DataPoint
		@aws_subscribe(mutations: ["createDataPoint"])
	onUpdateDataPoint(name: ID, createdAt: AWSDateTime, value: Int): DataPoint
		@aws_subscribe(mutations: ["updateDataPoint"])
	onDeleteDataPoint(name: ID, createdAt: AWSDateTime, value: Int): DataPoint
		@aws_subscribe(mutations: ["deleteDataPoint"])
}

input TableBooleanFilterInput {
	ne: Boolean
	eq: Boolean
}

input TableDataPointFilterInput {
	name: TableIDFilterInput
	createdAt: TableStringFilterInput
	value: TableIntFilterInput
}

input TableFloatFilterInput {
	ne: Float
	eq: Float
	le: Float
	lt: Float
	ge: Float
	gt: Float
	contains: Float
	notContains: Float
	between: [Float]
}

input TableIDFilterInput {
	ne: ID
	eq: ID
	le: ID
	lt: ID
	ge: ID
	gt: ID
	contains: ID
	notContains: ID
	between: [ID]
	beginsWith: ID
}

input TableIntFilterInput {
	ne: Int
	eq: Int
	le: Int
	lt: Int
	ge: Int
	gt: Int
	contains: Int
	notContains: Int
	between: [Int]
}

input TableStringFilterInput {
	ne: String
	eq: String
	le: String
	lt: String
	ge: String
	gt: String
	contains: String
	notContains: String
	between: [String]
	beginsWith: String
}

input UpdateDataPointInput {
	name: ID!
	createdAt: AWSDateTime!
	value: Int
}
```