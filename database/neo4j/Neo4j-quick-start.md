# Quick start 

## Prepare to remote access the browser
```bash
ssh -i ~/.ssh/${KEY_NAME}.pem ubuntu@${PublicDnsName}
# To have Bolt accept non-local connections, uncomment this line for $NEO4J_HOME/conf/neo4j.conf or /etc/neo4j/neo4j.conf
dbms.connector.bolt.address=0.0.0.0:7687
dbms.connector.bolt.tls_level=OPTIONAL

sudo systemctl restart neo4j
sudo systemctl stop neo4j
sudo systemctl start neo4j
```

## Load the sample data to postgreSQL
```bash
psql
postgres=# CREATE DATABASE northwind;
CREATE DATABASE

psql -d northwind < /tmp/northwind.postgre.sql

# Exporting the Data to CSV
psql -d northwind
COPY (SELECT * FROM customers) TO '/tmp/customers.csv' WITH CSV header;
COPY (SELECT * FROM suppliers) TO '/tmp/suppliers.csv' WITH CSV header;
COPY (SELECT * FROM products)  TO '/tmp/products.csv' WITH CSV header;
COPY (SELECT * FROM employees) TO '/tmp/employees.csv' WITH CSV header;
COPY (SELECT * FROM categories) TO '/tmp/categories.csv' WITH CSV header;
COPY (SELECT * FROM orders LEFT OUTER JOIN order_details ON order_details."OrderID" = orders."OrderID") TO '/tmp/orders.csv' WITH CSV header;
```

## Manage database using Cypher - Destop and Enterprise edition
https://neo4j.com/developer/manage-multiple-databases/

```bash
# first login
cypher-shell -a ${neo4j_ip} -u neo4j -p neo4j
Change your password to i-08f959180e79799ed
cypher-shell -a ${neo4j_ip} -u neo4j -p i-08f959180e79799ed

:use system
neo4j@system> SHOW DATABASES;
neo4j@system> CREATE DATABASE movieGraph;
```

## Create database using Cypher - Community edition 
https://community.neo4j.com/t/create-multiple-databases-in-community-version/5025

```bash
Creat a folder named like 'xxx.db' (just a blank folder) in root\data\databases.

From Neo4j root folder open 'conf' folder and open neo4j.conf file in Notepad. Update this line: dbms.active_database = xxx.db and 'Save'.

Restart and launch Neo4j. Now you will see a blank database in your 'xxx.db' folder. You are ready to play with your new database. This will be the current active database.

You can switch between databases by editing neo4j.conf file and restarting Neo4j.
```

## Importing the Data using Cypher
```bash
# Put the import dataset and scripts under directory /var/lib/neo4j/import
cypher-shell -a ${neo4j_ip} -u neo4j -p i-08f959180e79799ed < import_csv.cypher

cypher-shell -a ${neo4j_ip} -u neo4j -p i-08f959180e79799ed

neo4j@neo4j> MATCH (p:Product {productName:"Chocolade"}) return p;

neo4j@neo4j> MATCH (choc:Product {productName:'Chocolade'})<-[:PRODUCT]-(:Order)<-[:SOLD]-(employee),
                    (employee)-[:SOLD]->(o2)-[:PRODUCT]->(other:Product)
            RETURN employee.employeeID, other.productName, count(distinct o2) as count
            ORDER BY count DESC
            LIMIT 5;

neo4j@neo4j> MATCH path = (e:Employee)<-[:REPORTS_TO]-(sub)
            RETURN e.employeeID AS manager, sub.employeeID AS employee;


neo4j@neo4j> MATCH path = (e:Employee)<-[:REPORTS_TO*]-(sub)
             WITH e, sub, [person in NODES(path) | person.employeeID][1..-1] AS path
             RETURN e.employeeID AS manager, sub.employeeID AS employee, CASE WHEN LENGTH(path) = 0 THEN "Direct Report" ELSE path END AS via
             ORDER BY LENGTH(path);


neo4j@neo4j> MATCH (e:Employee)
             OPTIONAL MATCH (e)<-[:REPORTS_TO*0..]-(sub)-[:SOLD]->(order)
             RETURN e.employeeID, [x IN COLLECT(DISTINCT sub.employeeID) WHERE x <> e.employeeID] AS reports, COUNT(distinct order) AS totalOrders
             ORDER BY totalOrders DESC;

neo4j@neo4j> MATCH (mgr:Employee {EmployeeID:5})
             MATCH (emp:Employee {EmployeeID:3})-[rel:REPORTS_TO]->()
             DELETE rel
             CREATE (emp)-[:REPORTS_TO]->(mgr)
             RETURN *;
```

## More example
https://neo4j.com/developer/example-data/