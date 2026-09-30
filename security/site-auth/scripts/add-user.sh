#!/usr/bin/env bash
# add-user.sh — 在 site-auth 用户池里建一个账号，临时密码写进 ~/.config/site-auth/<用户名>.txt（仅本人可读），不打印
# 首次登录时托管登录页会要求改成自己的密码
# 用法：AWS_PROFILE=<profile> scripts/add-user.sh <用户名>
set -euo pipefail
user=${1:?usage: add-user.sh <username>}
export AWS_REGION=us-east-1
pool=$(aws cloudformation describe-stacks --stack-name SiteAuthPool --query "Stacks[0].Outputs[?OutputKey=='UserPoolId'].OutputValue" --output text)
pw="$(openssl rand -base64 18 | tr -d '/+=')Aa1"
aws cognito-idp admin-create-user --user-pool-id "$pool" --username "$user" --temporary-password "$pw" --message-action SUPPRESS > /dev/null
mkdir -p ~/.config/site-auth && umask 077
printf 'user: %s\ntemporary password: %s\n' "$user" "$pw" > ~/.config/site-auth/"$user".txt
echo "created $user; temporary password in ~/.config/site-auth/$user.txt (change it at first login, then delete the file)"
