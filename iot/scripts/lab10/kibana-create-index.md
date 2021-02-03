```json
PUT /trucks
{
  "mappings": {
    "properties": {
        "timestamp": {
          "type": "long",
          "copy_to": "datetime"
        },
        "datetime": {
          "type": "date",
          "store": true
        },
        "location": {
          "type": "geo_point"
        },
        "battery":{
        "type": "float"
        },
        "engine_temperature":{
        "type": "long"
        },
        "pressure":{
        "type": "long"
        },
        "rpm":{
        "type": "long"
        },
        "cargo_temperature":{
        "type": "long"
        }
      }
  }
}
```