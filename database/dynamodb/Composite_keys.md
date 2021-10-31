=== create GSI with city-dept===
aws dynamodb update-table --table-name employees \
--attribute-definitions AttributeName=state,AttributeType=S AttributeName=city_dept,AttributeType=S \
--global-secondary-index-updates file://gsi_city_dept.json

{
    "TableDescription": {
        "TableArn": "arn:aws:dynamodb:us-west-2:653299296276:table/employees", 
        "AttributeDefinitions": [
            {
                "AttributeName": "city_dept", 
                "AttributeType": "S"
            }, 
            {
                "AttributeName": "colA", 
                "AttributeType": "S"
            }, 
            {
                "AttributeName": "employeeid", 
                "AttributeType": "N"
            }, 
            {
                "AttributeName": "is_manager", 
                "AttributeType": "S"
            }, 
            {
                "AttributeName": "name", 
                "AttributeType": "S"
            }, 
            {
                "AttributeName": "state", 
                "AttributeType": "S"
            }, 
            {
                "AttributeName": "title", 
                "AttributeType": "S"
            }
        ], 
        "GlobalSecondaryIndexes": [
            {
                "IndexSizeBytes": 0, 
                "IndexName": "gsi_manager", 
                "Projection": {
                    "ProjectionType": "ALL"
                }, 
                "ProvisionedThroughput": {
                    "NumberOfDecreasesToday": 0, 
                    "WriteCapacityUnits": 10, 
                    "ReadCapacityUnits": 10
                }, 
                "IndexStatus": "ACTIVE", 
                "KeySchema": [
                    {
                        "KeyType": "HASH", 
                        "AttributeName": "is_manager"
                    }, 
                    {
                        "KeyType": "RANGE", 
                        "AttributeName": "title"
                    }
                ], 
                "IndexArn": "arn:aws:dynamodb:us-west-2:653299296276:table/employees/index/gsi_manager", 
                "ItemCount": 0
            }, 
            {
                "IndexSizeBytes": 0, 
                "IndexName": "gsi_overload", 
                "Projection": {
                    "ProjectionType": "ALL"
                }, 
                "ProvisionedThroughput": {
                    "NumberOfDecreasesToday": 0, 
                    "WriteCapacityUnits": 100, 
                    "ReadCapacityUnits": 100
                }, 
                "IndexStatus": "ACTIVE", 
                "KeySchema": [
                    {
                        "KeyType": "HASH", 
                        "AttributeName": "colA"
                    }, 
                    {
                        "KeyType": "RANGE", 
                        "AttributeName": "name"
                    }
                ], 
                "IndexArn": "arn:aws:dynamodb:us-west-2:653299296276:table/employees/index/gsi_overload", 
                "ItemCount": 0
            }, 
            {
                "IndexSizeBytes": 0, 
                "IndexName": "gsi_city_dept", 
                "Projection": {
                    "ProjectionType": "ALL"
                }, 
                "ProvisionedThroughput": {
                    "NumberOfDecreasesToday": 0, 
                    "WriteCapacityUnits": 10, 
                    "ReadCapacityUnits": 10
                }, 
                "IndexStatus": "CREATING", 
                "Backfilling": false, 
                "KeySchema": [
                    {
                        "KeyType": "HASH", 
                        "AttributeName": "state"
                    }, 
                    {
                        "KeyType": "RANGE", 
                        "AttributeName": "city_dept"
                    }
                ], 
                "IndexArn": "arn:aws:dynamodb:us-west-2:653299296276:table/employees/index/gsi_city_dept", 
                "ItemCount": 0
            }
        ], 
        "ProvisionedThroughput": {
            "NumberOfDecreasesToday": 0, 
            "WriteCapacityUnits": 100, 
            "ReadCapacityUnits": 100
        }, 
        "TableSizeBytes": 0, 
        "TableName": "employees", 
        "TableStatus": "UPDATING", 
        "TableId": "1dcdb39a-ba23-4d7a-96fd-25c3324d3a29", 
        "KeySchema": [
            {
                "KeyType": "HASH", 
                "AttributeName": "employeeid"
            }, 
            {
                "KeyType": "RANGE", 
                "AttributeName": "colA"
            }
        ], 
        "ItemCount": 0, 
        "CreationDateTime": 1550026951.272
    }
}

[ec2-user@ip-172-31-37-202 workshop]$ aws dynamodb describe-table --table-name employees | grep IndexStatus
                "IndexStatus": "ACTIVE", 
                "IndexStatus": "ACTIVE", 
                "IndexStatus": "CREATING", 
[ec2-user@ip-172-31-37-202 workshop]$ aws dynamodb wait table-exists --table-name employees
[ec2-user@ip-172-31-37-202 workshop]$ aws dynamodb describe-table --table-name employees | grep IndexStatus
                "IndexStatus": "ACTIVE", 
                "IndexStatus": "ACTIVE", 
                "IndexStatus": "ACTIVE",
                
==== query with city_dept===
if value2 == "-":
    ke = Key('state').eq(value1)
else:
    ke = Key('state').eq(value1) & Key('city_dept').begins_with(value2)

response = table.query(
    IndexName='gsi_city_dept',
    KeyConditionExpression=ke
    )

query from state:
[ec2-user@ip-172-31-37-202 workshop]$ python query_city_dept.py employees TX
List of employees . State: TX
    Name: Bree Gershom. City: Austin. Dept: Development
    Name: Edin Purbrick. City: Austin. Dept: Development
    Name: Cyndi Clingoe. City: Austin. Dept: Development
    Name: Malinde Spellman. City: Austin. Dept: Development
    Name: Leela Proschek. City: Austin. Dept: Development
    Name: Tristam Mole. City: Austin. Dept: Development
    Name: Kimmy Sowten. City: Austin. Dept: Development
    Name: Dani Scay. City: Austin. Dept: Development
    Name: Lida Flescher. City: Austin. Dept: Development
    Name: Giovanni Goutcher. City: Austin. Dept: Development
    Name: Keir Cashell. City: Austin. Dept: Development
    Name: Jourdain Verryan. City: Austin. Dept: Development
    Name: Katerina Houndson. City: Austin. Dept: Development
    Name: Noella Reihm. City: Austin. Dept: Development
    Name: Charles Corneliussen. City: Austin. Dept: Development
    Name: Roddie Bagniuk. City: Austin. Dept: Development
    Name: Felike Baynam. City: Austin. Dept: Development
    Name: Guillemette Lamzed. City: Austin. Dept: Operation
    Name: Velvet Warnes. City: Austin. Dept: Operation
    Name: Goldie Climo. City: Austin. Dept: Operation
    Name: Gipsy McIlvenna. City: Austin. Dept: Operation
    Name: Guntar Hockell. City: Austin. Dept: Operation
    Name: Cherie Pettengell. City: Austin. Dept: Operation
    Name: Wiatt Hansie. City: Austin. Dept: Operation
    Name: Lilian Somerfield. City: Austin. Dept: Operation
    Name: Mickie Charteris. City: Austin. Dept: Operation
    Name: Mignonne Tuckerman. City: Austin. Dept: Operation
    Name: Wilie Zotto. City: Austin. Dept: Operation
    Name: Roseanna Elwell. City: Austin. Dept: Operation
    Name: Wylma Tunniclisse. City: Austin. Dept: Operation
    Name: Maurene Wildbore. City: Austin. Dept: Operation
    Name: Angy Kemer. City: Austin. Dept: Operation
    Name: Millicent Gittus. City: Austin. Dept: Operation
    Name: Mayer Towne. City: Austin. Dept: Operation
    Name: Arliene Khomishin. City: Austin. Dept: Security
    Name: Cyrillus Greenhalgh. City: Austin. Dept: Support
    Name: Bryn Madison. City: Austin. Dept: Support
    Name: Chanda Underwood. City: Austin. Dept: Support
    Name: Ebba Valente. City: Austin. Dept: Support
    Name: Virgilio Eisenberg. City: Austin. Dept: Support
    Name: Clotilda Willmot. City: Austin. Dept: Support
    Name: Emmye Chong. City: Austin. Dept: Support
    Name: Cirillo Bartoli. City: Austin. Dept: Support
    Name: Rafael Castille. City: Austin. Dept: Support
    Name: Ynes Le Estut. City: Dallas. Dept: Development
    Name: Cordie Petrak. City: Dallas. Dept: Development
    Name: Keven McKew. City: Dallas. Dept: Development
    Name: Austin Coalburn. City: Dallas. Dept: Development
    Name: Sterling Twitching. City: Dallas. Dept: Development
    Name: Randene Epp. City: Dallas. Dept: Development
    Name: Jere Vaughn. City: Dallas. Dept: Development
    Name: Dominica Northage. City: Dallas. Dept: Development
    Name: Grayce Duligal. City: Dallas. Dept: Development
    Name: Vivie Gladdis. City: Dallas. Dept: Development
    Name: Pollyanna Brownbridge. City: Dallas. Dept: Development
    Name: Waylin Broderick. City: Dallas. Dept: Development
    Name: Northrup Jakes. City: Dallas. Dept: Development
    Name: Den Geratt. City: Dallas. Dept: Development
    Name: Dominick Syson. City: Dallas. Dept: Development
    Name: Dwayne Fransemai. City: Dallas. Dept: Development
    Name: Lucretia Ruffell. City: Dallas. Dept: Development
    Name: Leonora Hyland. City: Dallas. Dept: Development
    Name: Myrah McLaverty. City: Dallas. Dept: Development
    Name: Nadeen Born. City: Dallas. Dept: Development
    Name: Valeria Gilliatt. City: Dallas. Dept: Development
    Name: Oralle Boler. City: Dallas. Dept: Development
    Name: Oralle Chessell. City: Dallas. Dept: Development
    Name: Nathanael Pursey. City: Dallas. Dept: Development
    Name: Emmye Fletcher. City: Dallas. Dept: Operation
    Name: Karlis Prisk. City: Dallas. Dept: Operation
    Name: Arlan Cummings. City: Dallas. Dept: Operation
    Name: Marve Bignold. City: Dallas. Dept: Operation
    Name: Audra Leahey. City: Dallas. Dept: Operation
    Name: Bone Ruggs. City: Dallas. Dept: Operation
    Name: Brady Marvel. City: Dallas. Dept: Operation
    Name: Lizbeth Proudler. City: Dallas. Dept: Operation
    Name: Waneta Parminter. City: Dallas. Dept: Operation
    Name: Garvey Chilcotte. City: Dallas. Dept: QA
    Name: Ophelia Smallpeace. City: Dallas. Dept: Security
    Name: Shayne MacGuigan. City: Dallas. Dept: Support
    Name: Huey Yeliashev. City: Dallas. Dept: Support
    Name: Lisbeth Elcoate. City: Dallas. Dept: Support
    Name: Rica Hordle. City: Dallas. Dept: Support
    Name: Fergus Beane. City: Dallas. Dept: Support
    Name: Melinda Roles. City: Dallas. Dept: Support
    Name: Markus Sansam. City: Dallas. Dept: Support
    Name: Britteny Lacaze. City: Dallas. Dept: Support
    Name: Brittani Hunn. City: Dallas. Dept: Support
    Name: Netta Bickerton. City: Dallas. Dept: Support
    Name: Dorita Feragh. City: Dallas. Dept: Support
    Name: Oby Peniello. City: Dallas. Dept: Support
    Name: Lesly Laydon. City: Houston. Dept: Development
    Name: Florella Allsep. City: Houston. Dept: Development
    Name: Wylie Mullally. City: Houston. Dept: Development
    Name: Emilia Torre. City: Houston. Dept: Development
    Name: Gertrudis Cade. City: Houston. Dept: Development
    Name: Lynnell Wallage. City: Houston. Dept: Development
    Name: Towny Twitty. City: Houston. Dept: Development
    Name: Gustavo Balwin. City: Houston. Dept: Development
    Name: Iggy Tigner. City: Houston. Dept: Development
    Name: Judye Tellett. City: Houston. Dept: Development
    Name: Candice McLane. City: Houston. Dept: Development
    Name: Chelsea Gravenor. City: Houston. Dept: Development
    Name: Janith Burbridge. City: Houston. Dept: Development
    Name: Lyndel Espino. City: Houston. Dept: Development
    Name: Audry Sabatini. City: Houston. Dept: Development
    Name: Olag Benge. City: Houston. Dept: Development
    Name: Merwyn Petters. City: Houston. Dept: Development
    Name: Ramsey Maggorini. City: Houston. Dept: Development
    Name: Ced Grimoldby. City: Houston. Dept: Operation
    Name: Barty Stockney. City: Houston. Dept: Operation
    Name: Tilda McKeag. City: Houston. Dept: Operation
    Name: Kimbell Mounsie. City: Houston. Dept: Operation
    Name: Jena Latham. City: Houston. Dept: Operation
    Name: Berkly Lindenbaum. City: Houston. Dept: Operation
    Name: Tadd Kitchenside. City: Houston. Dept: Operation
    Name: Amity Bosnell. City: Houston. Dept: Operation
    Name: Germayne Barthrup. City: Houston. Dept: Operation
    Name: Reba Wickman. City: Houston. Dept: Operation
    Name: Cordie Troctor. City: Houston. Dept: Operation
    Name: Blinnie Geddes. City: Houston. Dept: Operation
    Name: Astra Hailes. City: Houston. Dept: Operation
    Name: Bronson Coverdale. City: Houston. Dept: Operation
    Name: Hammad Gianiello. City: Houston. Dept: Operation
    Name: Micheil Ord. City: Houston. Dept: Operation
    Name: Bambie Lovewell. City: Houston. Dept: Security
    Name: Elva Yokley. City: Houston. Dept: Security
    Name: Darill Robinette. City: Houston. Dept: Support
    Name: Dierdre Batting. City: Houston. Dept: Support
    Name: Donny De Avenell. City: Houston. Dept: Support
    Name: Vida Sampson. City: Houston. Dept: Support
    Name: Amery Plaxton. City: Houston. Dept: Support
    Name: Marina Berends. City: Houston. Dept: Support
    Name: Brandy Burstow. City: Houston. Dept: Support
    Name: Estella Maps. City: Houston. Dept: Support
    Name: Nicky Ventum. City: Houston. Dept: Support
    Name: Padraig Baudy. City: Houston. Dept: Support
    Name: Traver Bosanko. City: Houston. Dept: Support
    Name: Eimile Lownsbrough. City: Houston. Dept: Support
    Name: Abramo Livoir. City: Houston. Dept: Support
    Name: Delila Alywen. City: Houston. Dept: Support
    Name: Tod Landes. City: San Antonio. Dept: Development
    Name: Kailey Bew. City: San Antonio. Dept: Development
    Name: Oliviero Dellit. City: San Antonio. Dept: Development
    Name: Gillie Mc Pake. City: San Antonio. Dept: Development
    Name: Lillis Ambrogini. City: San Antonio. Dept: Development
    Name: Estelle Slocumb. City: San Antonio. Dept: Development
    Name: Linzy Seabrook. City: San Antonio. Dept: Development
    Name: Malcolm Adiscot. City: San Antonio. Dept: Development
    Name: Diahann Mannie. City: San Antonio. Dept: Development
    Name: Jess Vynehall. City: San Antonio. Dept: Development
    Name: Roxanne Oakes. City: San Antonio. Dept: Development
    Name: Adela Clearley. City: San Antonio. Dept: Development
    Name: Fernando Horning. City: San Antonio. Dept: Development
    Name: Dara D'Souza. City: San Antonio. Dept: Development
    Name: Gregorio Chilvers. City: San Antonio. Dept: Development
    Name: Humphrey Scotney. City: San Antonio. Dept: Development
    Name: Fionna Cardozo. City: San Antonio. Dept: Development
    Name: Onfre Gricewood. City: San Antonio. Dept: Development
    Name: Dion Janovsky. City: San Antonio. Dept: Development
    Name: Tersina Hemshall. City: San Antonio. Dept: Development
    Name: Sharleen Blackaller. City: San Antonio. Dept: Development
    Name: Arny Rivilis. City: San Antonio. Dept: Operation
    Name: Tedi Cheak. City: San Antonio. Dept: Operation
    Name: Franzen Mussotti. City: San Antonio. Dept: Operation
    Name: Dewie Bavester. City: San Antonio. Dept: Operation
    Name: Jen Aldren. City: San Antonio. Dept: Operation
    Name: Preston Townes. City: San Antonio. Dept: Operation
    Name: Vivyanne Fairholme. City: San Antonio. Dept: Operation
    Name: Debora Alsford. City: San Antonio. Dept: Operation
    Name: Evelin Note. City: San Antonio. Dept: Operation
    Name: Janina Oakinfold. City: San Antonio. Dept: Operation
    Name: Annora Blackall. City: San Antonio. Dept: Operation
    Name: Eva Toombes. City: San Antonio. Dept: Operation
    Name: Stephanus Tomasi. City: San Antonio. Dept: Operation
    Name: Terry Epinay. City: San Antonio. Dept: QA
    Name: Sapphire Mitchely. City: San Antonio. Dept: QA
    Name: Aubrette Line. City: San Antonio. Dept: QA
    Name: Nickolai Hiers. City: San Antonio. Dept: Security
    Name: Rockie Artus. City: San Antonio. Dept: Security
    Name: Errol Shepland. City: San Antonio. Dept: Support
    Name: Miltie Speake. City: San Antonio. Dept: Support
    Name: Sherye Grunwall. City: San Antonio. Dept: Support
    Name: Filippo Semiras. City: San Antonio. Dept: Support
    Name: Ari Wilstead. City: San Antonio. Dept: Support
    Name: Any Easterbrook. City: San Antonio. Dept: Support
    Name: Tanny Janic. City: San Antonio. Dept: Support
    Name: Rosette Rotherham. City: San Antonio. Dept: Support
    Name: Foss Shawell. City: San Antonio. Dept: Support
    Name: Ralph Petlyura. City: San Antonio. Dept: Support
    Name: Agneta Apps. City: San Antonio. Dept: Support
    Name: Cullie Sheehy. City: San Antonio. Dept: Support
    Name: Danit Keane. City: San Antonio. Dept: Support
    Name: Odella Kringe. City: San Antonio. Dept: Support
    Name: Tandie Tolefree. City: San Antonio. Dept: Support
    Name: Yolanda Mathieu. City: San Antonio. Dept: Support
    Name: Babara Rosewarne. City: San Antonio. Dept: Support
Total of employees: 197. Execution time: 0.177328109741 seconds

query from city
[ec2-user@ip-172-31-37-202 workshop]$ python query_city_dept.py employees TX --citydept Dallas
List of employees . State: TX
    Name: Ynes Le Estut. City: Dallas. Dept: Development
    Name: Cordie Petrak. City: Dallas. Dept: Development
    Name: Keven McKew. City: Dallas. Dept: Development
    Name: Austin Coalburn. City: Dallas. Dept: Development
    Name: Sterling Twitching. City: Dallas. Dept: Development
    Name: Randene Epp. City: Dallas. Dept: Development
    Name: Jere Vaughn. City: Dallas. Dept: Development
    Name: Dominica Northage. City: Dallas. Dept: Development
    Name: Grayce Duligal. City: Dallas. Dept: Development
    Name: Vivie Gladdis. City: Dallas. Dept: Development
    Name: Pollyanna Brownbridge. City: Dallas. Dept: Development
    Name: Waylin Broderick. City: Dallas. Dept: Development
    Name: Northrup Jakes. City: Dallas. Dept: Development
    Name: Den Geratt. City: Dallas. Dept: Development
    Name: Dominick Syson. City: Dallas. Dept: Development
    Name: Dwayne Fransemai. City: Dallas. Dept: Development
    Name: Lucretia Ruffell. City: Dallas. Dept: Development
    Name: Leonora Hyland. City: Dallas. Dept: Development
    Name: Myrah McLaverty. City: Dallas. Dept: Development
    Name: Nadeen Born. City: Dallas. Dept: Development
    Name: Valeria Gilliatt. City: Dallas. Dept: Development
    Name: Oralle Boler. City: Dallas. Dept: Development
    Name: Oralle Chessell. City: Dallas. Dept: Development
    Name: Nathanael Pursey. City: Dallas. Dept: Development
    Name: Emmye Fletcher. City: Dallas. Dept: Operation
    Name: Karlis Prisk. City: Dallas. Dept: Operation
    Name: Arlan Cummings. City: Dallas. Dept: Operation
    Name: Marve Bignold. City: Dallas. Dept: Operation
    Name: Audra Leahey. City: Dallas. Dept: Operation
    Name: Bone Ruggs. City: Dallas. Dept: Operation
    Name: Brady Marvel. City: Dallas. Dept: Operation
    Name: Lizbeth Proudler. City: Dallas. Dept: Operation
    Name: Waneta Parminter. City: Dallas. Dept: Operation
    Name: Garvey Chilcotte. City: Dallas. Dept: QA
    Name: Ophelia Smallpeace. City: Dallas. Dept: Security
    Name: Shayne MacGuigan. City: Dallas. Dept: Support
    Name: Huey Yeliashev. City: Dallas. Dept: Support
    Name: Lisbeth Elcoate. City: Dallas. Dept: Support
    Name: Rica Hordle. City: Dallas. Dept: Support
    Name: Fergus Beane. City: Dallas. Dept: Support
    Name: Melinda Roles. City: Dallas. Dept: Support
    Name: Markus Sansam. City: Dallas. Dept: Support
    Name: Britteny Lacaze. City: Dallas. Dept: Support
    Name: Brittani Hunn. City: Dallas. Dept: Support
    Name: Netta Bickerton. City: Dallas. Dept: Support
    Name: Dorita Feragh. City: Dallas. Dept: Support
    Name: Oby Peniello. City: Dallas. Dept: Support
Total of employees: 47. Execution time: 0.136274814606 seconds

query from city_dept
[ec2-user@ip-172-31-37-202 workshop]$ python query_city_dept.py employees TX --citydept Dallas:Op
List of employees . State: TX
    Name: Emmye Fletcher. City: Dallas. Dept: Operation
    Name: Karlis Prisk. City: Dallas. Dept: Operation
    Name: Arlan Cummings. City: Dallas. Dept: Operation
    Name: Marve Bignold. City: Dallas. Dept: Operation
    Name: Audra Leahey. City: Dallas. Dept: Operation
    Name: Bone Ruggs. City: Dallas. Dept: Operation
    Name: Brady Marvel. City: Dallas. Dept: Operation
    Name: Lizbeth Proudler. City: Dallas. Dept: Operation
    Name: Waneta Parminter. City: Dallas. Dept: Operation
Total of employees: 9. Execution time: 0.128446102142 seconds
