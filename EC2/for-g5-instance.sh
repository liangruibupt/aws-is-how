#!/usr/bin/env bash

# 示例参数, 请根据实际情况进行修改
AMI_ID="ami-xxxxxx"
INSTANCE_TYPE="g5.12xlarge"
KEY_NAME="your-key-name"
SECURITY_GROUP="sg-xxxxxx"
SUBNET_ID="subnet-xxxxxx"
REGION="cn-northwest-1"

while true; do
    echo "Attempting to create instance of type ${INSTANCE_TYPE}..."

    # 尝试创建实例，并将输出保存在变量 response 中
    response=$(aws ec2 run-instances \
        --image-id "${AMI_ID}" \
        --instance-type "${INSTANCE_TYPE}" \
        --key-name "${KEY_NAME}" \
        --security-group-ids "${SECURITY_GROUP}" \
        --subnet-id "${SUBNET_ID}" \
        --count 1 \
        --region "${REGION}" 2>&1)

    # 检查上一条命令是否成功 (exit code == 0)
    if [ $? -eq 0 ]; then
        # 用 jq 解析出创建的实例 ID；也可使用其他方式筛选 JSON
        instance_id=$(echo "${response}" | jq -r '.Instances[0].InstanceId' 2>/dev/null)

        # 判断 instance_id 是否有效
        if [ -n "${instance_id}" ] && [ "${instance_id}" != "null" ]; then
            echo "Successfully created instance with ID: ${instance_id}"
            exit 0
        fi
    fi

    # 如果创建实例失败或解析不到 instance ID，则输出提示信息并等待 60 秒重试
    echo "Failed to create instance. Retrying in 1 minute..."
    sleep 60
done