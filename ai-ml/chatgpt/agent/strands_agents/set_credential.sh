# Get temporary credentials with 1-day duration
aws_temp_credentials=$(aws sts get-session-token --duration-seconds 86400 --profile global_ruiliang)

# Extract and set the credentials as environment variables
export AWS_ACCESS_KEY_ID=$(echo $aws_temp_credentials | jq -r '.Credentials.AccessKeyId')
export AWS_SECRET_ACCESS_KEY=$(echo $aws_temp_credentials | jq -r '.Credentials.SecretAccessKey')
export AWS_SESSION_TOKEN=$(echo $aws_temp_credentials | jq -r '.Credentials.SessionToken')

# Verify the expiration time
echo "Credentials will expire at: $(echo $aws_temp_credentials | jq -r '.Credentials.Expiration')"
echo "AWS_ACCESS_KEY_ID: $AWS_ACCESS_KEY_ID"
echo "AWS_SECRET_ACCESS_KEY: $AWS_SECRET_ACCESS_KEY"