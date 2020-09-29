# Integrating Sales and Service for Asset Management with AWS Neptune

![asset-mgnt-architecture](media/asset-mgnt-architecture.jpg)

John (dark blue cake) is a scientist and an employee of ACME lab corporation (light blue cake). John has purchased an freezer, DNA Sequencer (QuantStudio), and a master mix regent to perform his experiments. As John works with these instruments, his freezer door malfunctions. ACME corporation has a ‘silver’ tier contract and notifies the manufacturer that the freezer door has malfunctioned. The manufacturer of the freezer assigns a service ticket to a knowledgeable service technician, Joe (orange cake).

## Creating a Neptune Database

- DB Engine: 1.0.3.0.R1
- Dev and Testing environment
- DB instance size: db.r5.large
- Enable High Availability – No
- Instance identifier: <asset-mgnt-db>

Or you can use the CloudFormation to create the [getting start database](scripts/neptune-full-stack-nested-template.json)

## Launch Neptune Workbench

The best way to get started with Amazon Neptune is to use the [Neptune workbench](https://docs.aws.amazon.com/neptune/latest/userguide/notebooks.html). 

- Create notebook
- Name: <asset-mgnt-notebook>
- Create IAM Role

## Run the Asset Management Notebook

Upload the assetmanagement.ipynb and run it

## Run Air Routes Notebook

1. Launch the CloudFromation Stack to create the Neptune database and sagemaker Notebook

https://s3.amazonaws.com/aws-neptune-customer-samples/neptune-sagemaker/cloudformation-templates/neptune-sagemaker/neptune-sagemaker-base-stack.json

2. Run the sagemaker Notebook to interactive with Neptune database

# Reference
[Integrating Sales and Service with AWS Neptune](https://github.com/aws-samples/aws-neptune-asset-management)

[Building a customer identity graph with Amazon Neptune](https://aws.amazon.com/blogs/database/building-a-customer-identity-graph-with-amazon-neptune/)

[Analyze Amazon Neptune Graphs using Amazon SageMaker Jupyter Notebooks](https://aws.amazon.com/blogs/database/analyze-amazon-neptune-graphs-using-amazon-sagemaker-jupyter-notebooks/)

[Let Me Graph That For You – Part 1 – Air Routes](https://aws.amazon.com/blogs/database/let-me-graph-that-for-you-part-1-air-routes/)