# AWS HealthOmics - End to End Workshop

This workshop is used to learn and practice the AWS HealthOmics. The workshop link is https://catalog.workshops.aws/amazon-omics-end-to-end/en-US. This document is used to highlight key pratice and notices during the workshop execution

## Self-directed workshop prerequisites
1. Ensure that AWS_REGION has been set correctly, and is used in the two bucket names. If not set correctly, set the region name manually using this syntax: `AWS_REGION=<region-name>`
   
```
ACCOUNT_ID=$(aws sts get-caller-identity --output text --query "Account")
AWS_REGION=$(aws configure get region)
INPUT_BUCKET_NAME=aws-genomics-static-${AWS_REGION}
OUTPUT_BUCKET_NAME=omics-output-${AWS_REGION}-${ACCOUNT_ID}
cat << EOF
Please check that the values of these variables are  correct:
ACCOUNT_ID = $ACCOUNT_ID
AWS_REGION = $AWS_REGION
INPUT_BUCKET_NAME = $INPUT_BUCKET_NAME
OUTPUT_BUCKET_NAME = $OUTPUT_BUCKET_NAME
EOF
```
   
1. You can use the `aws configure` to configure the right AWS credential
   
2. If you run the workshop except us-east-1, when run the command `aws s3api create-bucket --bucket $OUTPUT_BUCKET_NAME --region $AWS_REGION`. 
   
    It will report error `An error occurred (IllegalLocationConstraintException) when calling the CreateBucket operation: The unspecified location constraint is incompatible for the region specific endpoint this request was sent to.`. 

    The reason is `You need to specify the location constraint for every region except us-east-1. See the docs for examples.`. To fix it, you can change the command to `aws s3api create-bucket --bucket $OUTPUT_BUCKET_NAME --region $AWS_REGION --create-bucket-configuration LocationConstraint=$AWS_REGION`

3. Create Service Role
   
    `aws iam create-role --role-name "OmicsUnifiedJobRole" --assume-role-policy-document file://omics-trust-policy.json --region $AWS_REGION`

4. Create and Attach a permissions policy 
   
    ```
    ACCOUNT_ID=$(aws sts get-caller-identity --output text --query "Account")

    aws iam create-policy --policy-name OmicsWorkshopPermissionsPolicy --policy-document file://omics-service-policy.json --region $AWS_REGION`

    aws iam attach-role-policy --role-name OmicsUnifiedJobRole --policy-arn "arn:aws:iam::${ACCOUNT_ID}:policy/OmicsWorkshopPermissionsPolicy" --region $AWS_REGION
    ```


6. Create SageMaker Notebook Role

    `aws iam create-role --role-name "SageMakerNotebookInstanceRole" --assume-role-policy-document file://notebook-trust-policy.json --region $AWS_REGION`

    `aws iam create-policy --policy-name OmicsWorkshopNotebookPolicy --policy-document file://notebook-role-policy.json --region $AWS_REGION`

    `aws iam attach-role-policy --role-name SageMakerNotebookInstanceRole --policy-arn "arn:aws:iam::${ACCOUNT_ID}:policy/OmicsWorkshopNotebookPolicy" --region $AWS_REGION`

7. Prerequisites for running the GATK example

    The `create-repositories.sh`

    ```
    #! /bin/bash

    image_gatk=gatk:4.1.9.0
    image_gitc=genomes-in-the-cloud:2.4.7-1603303710
    AWS_REGION=$(aws configure get region)
    account_id=$(aws sts get-caller-identity --output text --query "Account")

    aws ecr get-login-password \
        --region $AWS_REGION \
        | docker login \
        --username AWS \
        --password-stdin $account_id.dkr.ecr.$AWS_REGION.amazonaws.com

    for image in $image_gatk $image_gitc; do
    repository_name=$(echo $image | sed -e 's/:.*//')
    aws ecr create-repository --repository-name $repository_name --region $AWS_REGION
    aws ecr set-repository-policy --repository-name $repository_name --policy-text file://repository-access.json --region $AWS_REGION

    docker pull public.ecr.aws/aws-genomics/broadinstitute/$image
    docker tag \
        public.ecr.aws/aws-genomics/broadinstitute/$image \
        $account_id.dkr.ecr.$AWS_REGION.amazonaws.com/$image
    docker push $account_id.dkr.ecr.$AWS_REGION.amazonaws.com/$image
    done
    ```

## HealthOmics Storage
1. Create a Reference Store
    ```
    aws omics list-reference-stores --region $AWS_REGION
    aws omics create-reference-store --name "hg19" --region $AWS_REGION
    aws omics create-reference-store --name "GRCh38-hg38" --region $AWS_REGION

    REFERENCE_STORE_ID=$(aws omics list-reference-stores --output text --query 'referenceStores[0].id' --region $AWS_REGION)
    INPUT_BUCKET_NAME=aws-genomics-static-${AWS_REGION}

    aws omics list-references --reference-store-id ${REFERENCE_STORE_ID}

    REFERENCE_IMPORT_JOB_ID=$(aws omics start-reference-import-job \
	--reference-store-id ${REFERENCE_STORE_ID} \
	--role-arn arn:aws:iam::${ACCOUNT_ID}:role/OmicsUnifiedJobRole \
	--sources sourceFile=s3://${INPUT_BUCKET_NAME}/omics-workshop/data/references/hg38/Homo_sapiens_assembly38.fasta,name=GRCh38-hg38 \
    --output text --query 'id' --region $AWS_REGION)

    echo REFERENCE_IMPORT_JOB_ID = $REFERENCE_IMPORT_JOB_ID

    aws omics get-reference-import-job \
	--reference-store-id ${REFERENCE_STORE_ID} \
	--id ${REFERENCE_IMPORT_JOB_ID} --region $AWS_REGION


    REFERENCE_IMPORT_JOB_ID=$(aws omics start-reference-import-job \
	--reference-store-id ${REFERENCE_STORE_ID} \
	--role-arn arn:aws:iam::${ACCOUNT_ID}:role/OmicsUnifiedJobRole \
	--sources sourceFile=s3://${INPUT_BUCKET_NAME}/omics-workshop/data/references/fasta/hg19.fa,name=hg19 \
    --output text --query 'id' --region $AWS_REGION)

    echo $REFERENCE_IMPORT_JOB_ID

    aws omics get-reference-import-job \
	--reference-store-id ${REFERENCE_STORE_ID} \
	--id ${REFERENCE_IMPORT_JOB_ID} --region $AWS_REGION

    REFERENCE_ID=<REPLACE_ME>
    aws omics get-reference-metadata --reference-store-id ${REFERENCE_STORE_ID} --id ${REFERENCE_ID} --region $AWS_REGION

    REFERENCE_ARN=$(aws omics get-reference-metadata \
    --reference-store-id ${REFERENCE_STORE_ID} \
    --id ${REFERENCE_ID} \
    --output text --query 'arn' --region $AWS_REGION)
    echo $REFERENCE_ARN

    ```

2. Create a sequence store

    ```
    SEQUENCE_STORE_NAME=mySequenceStore-$(date +"%d-%m-%y")
    FALLBACK_LOCATION=omics-sequence-${ACCOUNT_ID}-$(date +"%d-%m-%y")
    aws omics create-sequence-store --name ${SEQUENCE_STORE_NAME} --fallback-location "s3://${FALLBACK_LOCATION}" --region $AWS_REGION

    aws omics list-sequence-stores --region $AWS_REGION
    SEQUENCE_STORE_ID=$(aws omics list-sequence-stores --filter name=${SEQUENCE_STORE_NAME} --output text --query 'sequenceStores[0].id' --region $AWS_REGION) 
    ```

3. Import ReadSets into a sequence store
    ```
    cat << EOF > readset-source.json
    [
        {
            "sourceFiles":
            {
                "source1": "s3://${INPUT_BUCKET_NAME}/omics-workshop/data/fastq/GIAB_NIST_NA12878_HG001_HiSeq_300x__L002_R1_001.fastq.gz",
                "source2": "s3://${INPUT_BUCKET_NAME}/omics-workshop/data/fastq/GIAB_NIST_NA12878_HG001_HiSeq_300x__L002_R2_001.fastq.gz"
            },
            "sourceFileType": "FASTQ",
            "subjectId": "NA12878",
            "sampleId": "12878_HG001",
            "referenceArn": "${REFERENCE_ARN}"
        },
        {
            "sourceFiles":
            {
                "source1": "s3://${INPUT_BUCKET_NAME}/omics-workshop/data/cram/1KG_high_cov_ERR3988761/HG00405.final.cram"
            },
            "sourceFileType": "CRAM",
            "subjectId": "HG00405",
            "sampleId": "HG00405_1kg_highcov",
            "referenceArn": "${REFERENCE_ARN}"
        }
    ]
    EOF

    READ_SET_IMPORT_JOB_ID=$(aws omics start-read-set-import-job \
    --sequence-store-id ${SEQUENCE_STORE_ID} \
    --role-arn arn:aws:iam::${ACCOUNT_ID}:role/OmicsUnifiedJobRole \
    --sources file://readset-source.json \
    --output text --query 'id' --region $AWS_REGION)
    echo READ_SET_IMPORT_JOB_ID = $READ_SET_IMPORT_JOB_ID

    aws omics get-read-set-import-job --id ${READ_SET_IMPORT_JOB_ID} --sequence-store-id ${SEQUENCE_STORE_ID} --region $AWS_REGION

    aws omics list-read-sets --sequence-store-id ${SEQUENCE_STORE_ID} --region $AWS_REGION
    
    READ_SET_ID=<REPLACE ME with Above>
    aws omics get-read-set-metadata --id ${READ_SET_ID} --sequence-store-id ${SEQUENCE_STORE_ID} --region $AWS_REGION

    ```

## HealthOmics Workflow
1. Create Workflow
    ```
    WORKFLOW_ID=$(aws omics create-workflow \
        --name $WORKFLOW_NAME \
        --engine NEXTFLOW \
        --description BasicExample \
        --definition-zip fileb://definition.zip \
        --parameter-template file://params-sample-description.json \
        --query 'id' --output text --region $AWS_REGION
    )

    aws omics wait workflow-active --id $WORKFLOW_ID
    aws omics get-workflow --id $WORKFLOW_ID
    aws omics get-workflow --id $WORKFLOW_ID > "workflow-sample.json"

    ## Complex Workflow
    aws s3 cp s3://${INPUT_BUCKET_NAME}/omics-workshop/gatkbestpractices.wdl.zip .

    GATK_WORKFLOW_ID=$(aws omics create-workflow \
        --name GATKVariantDiscovery \
        --engine WDL \
        --description GatkExample \
        --definition-zip fileb://gatkbestpractices.wdl.zip \
        --parameter-template file://params_gatk_workflow.json \
        --query 'id' --output text --region $AWS_REGION
    )

    aws omics wait workflow-active --id $GATK_WORKFLOW_ID
    aws omics get-workflow --id $GATK_WORKFLOW_ID > "workflow-gatk.json" 

    ```

2. Running workflows
    ```
    WORKFLOW_ID=$(jq -r '.id' workflow-sample.json)

    WORKFLOW_RUN_ID=$(aws omics start-run \
        --workflow-id ${WORKFLOW_ID} \
        --name run-one \
        --parameters file://workflow_parameters.json \
        --output-uri s3://${OUTPUT_BUCKET_NAME}/output/Sample \
        --role-arn arn:aws:iam::${ACCOUNT_ID}:role/OmicsUnifiedJobRole \
        --query 'id' --output text --region $AWS_REGION
    )

    aws omics get-run --id $WORKFLOW_RUN_ID --region $AWS_REGION

    aws omics list-runs --name run-one --region $AWS_REGION

    TASK_ID=$(aws omics list-run-tasks --id $WORKFLOW_RUN_ID --output text --query 'items[0].taskId' --region $AWS_REGION)
    aws omics list-run-tasks --id $WORKFLOW_RUN_ID --region $AWS_REGION
    aws omics get-run-task --id $WORKFLOW_RUN_ID --task-id $TASK_ID --region $AWS_REGION

    LOG_STREAM_ARN=$(aws omics get-run-task --id $WORKFLOW_RUN_ID \
    --task-id $TASK_ID --output text \
    --query 'logStream' --region $AWS_REGION
    )

    LOG_GROUP_NAME=$(echo $LOG_STREAM_ARN | awk -F : '{print $7}')
    LOG_STREAM_NAME=$(echo $LOG_STREAM_ARN | awk -F : '{print $9}')
    aws logs get-log-events --log-group-name $LOG_GROUP_NAME --log-stream-name $LOG_STREAM_NAME --region $AWS_REGION

    ```

3. Run GATK Best Practices Workflow
    ```
    GATK_WORKFLOW_ID=$(jq -r '.id' workflow-gatk.json)

    GATK_RUN_ID=$(aws omics start-run \
        --workflow-id ${GATK_WORKFLOW_ID} \
        --name run-gatk \
        --parameters file://gatk-workflow-parameters.json \
        --role-arn arn:aws:iam::${ACCOUNT_ID}:role/OmicsUnifiedJobRole \
        --output-uri s3://${OUTPUT_BUCKET_NAME}/output/GATK \
        --query 'id' --output text --region $AWS_REGION
    )

    aws omics get-run --id $GATK_RUN_ID --region $AWS_REGION

    ```

4. Ready2Run workflows
    ```
    aws omics list-workflows --type=READY2RUN --name="GATK-BP Germline fq2vcf for 30x genome" --region $AWS_REGION

    aws omics get-workflow --type READY2RUN --id 9500764 --region $AWS_REGION

    RTR_WORKFLOW_ID=$(aws omics start-run \
    --workflow-id 9500764 \
    --workflow-type READY2RUN \
    --parameters file://rtr_workflow_parameters.json \
    --role-arn arn:aws:iam::${ACCOUNT_ID}:role/OmicsUnifiedJobRole \
    --output-uri s3://${OUTPUT_BUCKET_NAME}/output/Sample \
    --output text --query 'id' --region $AWS_REGION
    )

    aws omics get-run --id $RTR_WORKFLOW_ID --region $AWS_REGION

    ```

## HealthOmics Analytics
1. Create Variant stores

    ```
    REFERENCE_STORE_ID=8482682129
    REFERENCE_ID=9173354078
    REFERENCE_ARN=$(aws omics get-reference-metadata \
        --reference-store-id ${REFERENCE_STORE_ID} \
        --id ${REFERENCE_ID} \
        --output text --query 'arn' --region $AWS_REGION)
    echo $REFERENCE_ARN
    aws omics list-references --reference-store-id ${REFERENCE_STORE_ID} --region $AWS_REGION

    ## Create Variant Store
    aws omics create-variant-store --name sample_variant_store \
        --reference referenceArn=${REFERENCE_ARN} --region $AWS_REGION

    aws omics get-variant-store --name sample_variant_store --region $AWS_REGION

    ```

2. Import a VCF into the Variant Store

    ```
    S3_VCF=s3://${INPUT_BUCKET_NAME}/omics-workshop/data/variants/HG001_GRCh38_1_22_v4.2.1_benchmark.vcf.gz

    VARIANT_IMPORT_JOB_ID=$(aws omics start-variant-import-job \
        --destination-name sample_variant_store \
        --items '[{"source":"'"$S3_VCF"'"}]' \
        --role-arn arn:aws:iam::${ACCOUNT_ID}:role/OmicsUnifiedJobRole \
        --output text --query 'jobId' --region $AWS_REGION
    )
    echo VARIANT_IMPORT_JOB_ID = $VARIANT_IMPORT_JOB_ID

    aws omics get-variant-import-job --job-id $VARIANT_IMPORT_JOB_ID --region $AWS_REGION

    ```

3. Create Annotation Store
    ```
    ANNOTATION_STORE_NAME=annotationstore_$(date +%s)

    aws omics create-annotation-store \
        --name $ANNOTATION_STORE_NAME \
        --reference referenceArn=${REFERENCE_ARN} \
        --store-format 'VCF' --region $AWS_REGION
    aws omics get-annotation-store --name ${ANNOTATION_STORE_NAME} --region $AWS_REGION

    ```

4. Import Clinvar into the Annotation Store
    ```
    S3_CLINVAR=s3://${INPUT_BUCKET_NAME}/omics-workshop/clinvar.vcf.gz
    ANNOTATION_IMPORT_JOB_ID=$(aws omics start-annotation-import-job \
        --role-arn arn:aws:iam::${ACCOUNT_ID}:role/OmicsUnifiedJobRole \
        --destination-name ${ANNOTATION_STORE_NAME} \
        --items '[{"source":"'"${S3_CLINVAR}"'"}]' \
        --output text --query 'jobId' --region $AWS_REGION
    )

    echo ANNOTATION_IMPORT_JOB_ID = $ANNOTATION_IMPORT_JOB_ID
    aws omics get-annotation-import-job --job-id $ANNOTATION_IMPORT_JOB_ID --region $AWS_REGION

    ```

5. Querying variants and annotations

    - Use AWS Lake Formation to create data lake administrators and resource links
    - Create a workgroup in Amazon Athena and use the Query Editor to run simple queries against Variant and Annotation stores
    - Use the AWS SDK for Pandas (aka AWS Wrangler) to run queries against Variant and Annoation stores in your SageMaker notebook

    ```sql
    SELECT variants.sampleid,
    variants.contigname,
    variants.start,
    variants.referenceallele,
    variants.alternatealleles,
    variants.attributes AS variant_attributes,
    clinvar.attributes AS clinvar_attributes 
    FROM omicsvariants as variants 
    INNER JOIN omicsannotation as clinvar ON 
    variants.contigname=CONCAT('chr',clinvar.contigname) 
    AND variants.start=clinvar.start 
    AND variants."end"=clinvar."end" 
    AND variants.referenceallele=clinvar.referenceallele 
    AND variants.alternatealleles=clinvar.alternatealleles 
    WHERE clinvar.attributes['CLNSIG']='Likely_pathogenic'

    ```

Notebook

    ```python
    !pip install awswrangler
    import awswrangler as wr

    sql = """
    SELECT * FROM "omicsdb"."omicsvariants" limit 10;
    """

    df_var = wr.athena.read_sql_query(
        sql,
        database="omicsdb",
        workgroup="athena3")

    df_var

    ```

## Proper noun
1. VCF - Variant Call Format. The Variant Call Format is a standard text file format used in bioinformatics for storing gene sequence variations. 
2. gVCF - Genomic VCF. The basic format specification is the same as for a regular VCF, but a Genomic VCF contains extra information.
3. GFF - In bioinformatics, the general feature format (gene-finding format, generic feature format, GFF) is a file format used for describing genes and other features of DNA, RNA and protein sequences.
4. TSV/CSV - A tab-separated values (TSV) file is a text format whose primary function is to store data in a table structure where each record in the table is recorded as one line of the text file.
5. GRCh38 - a full human genome reference (GRCh38, aka hg38) 
6. FASTQ - FASTQ format is a text-based format for storing both a biological sequence (usually nucleotide sequence) and its corresponding quality scores.
7. BAM - A BAM file (*. bam) is the compressed binary version of a SAM file that is used to represent aligned sequences up to 128 Mb.
8. SAM - Sequence Alignment Map is a text-based format originally for storing biological sequences aligned to a reference sequence
9. CRAM - Compressed Reference-oriented Alignment Map is a compressed columnar file format for storing biological sequences aligned to a reference sequence
10. SNPs - single nucleotide polymorphisms