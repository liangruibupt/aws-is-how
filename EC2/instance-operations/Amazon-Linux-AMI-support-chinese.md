# How to make Amazon Linux AMI support chinese

## 使用LANG=en_US.UTF-8
```bash
[ec2-user@ip-10-0-2-41 ~]$ export LANG=en_US.UTF-8
[ec2-user@ip-10-0-2-41 ~]$ locale
LANG=en_US.UTF-8
LC_CTYPE="en_US.UTF-8"
LC_NUMERIC="en_US.UTF-8"
LC_TIME="en_US.UTF-8"
LC_COLLATE="en_US.UTF-8"
LC_MONETARY="en_US.UTF-8"
LC_MESSAGES="en_US.UTF-8"
LC_PAPER="en_US.UTF-8"
LC_NAME="en_US.UTF-8"
LC_ADDRESS="en_US.UTF-8"
LC_TELEPHONE="en_US.UTF-8"
LC_MEASUREMENT="en_US.UTF-8"
LC_IDENTIFICATION="en_US.UTF-8"
LC_ALL=

[ec2-user@ip-10-0-2-41 ~]$ mkdir 中文目录
[ec2-user@ip-10-0-2-41 ~]$ ls
中文目录

[ec2-user@ip-10-0-2-41 ~]$ vi 中文python.py
[ec2-user@ip-10-0-2-41 ~]$ cat 中文python.py
#!/usr/bin/python
# -*- coding: utf-8 -*-

import json


print("这里是中文")

js = json.loads('{"insun": "泰囧 / 人在囧途2 / Lost in Thailand "}')
js_str = json.dumps(js, indent=2, ensure_ascii=False)
print(js_str)

json_str='[{"key":"mykey1", "value":"myvalue1"},{"name":"张三", "country":"中国"}]'
json_obj = json.loads(json_str)
json_formatted_str = json.dumps(json_obj, indent=2, ensure_ascii=False)
print(json_formatted_str)
[ec2-user@ip-10-0-2-41 ~]$ python 中文python.py
这里是中文
{
  "insun": "泰囧 / 人在囧途2 / Lost in Thailand "
}
[
  {
    "value": "myvalue1",
    "key": "mykey1"
  },
  {
    "country": "中国",
    "name": "张三"
  }
]
```

## 切换 LANG=zh_CN.UTF-8
```bash
[ec2-user@ip-10-0-2-41 ~]$ echo "export LANG=zh_CN.UTF-8" >> ~/.bash_profile
[ec2-user@ip-10-0-2-41 ~]$ source ~/.bash_profile
[ec2-user@ip-10-0-2-41 ~]$ locale
LANG=zh_CN.UTF-8
LC_CTYPE="zh_CN.UTF-8"
LC_NUMERIC="zh_CN.UTF-8"
LC_TIME="zh_CN.UTF-8"
LC_COLLATE="zh_CN.UTF-8"
LC_MONETARY="zh_CN.UTF-8"
LC_MESSAGES="zh_CN.UTF-8"
LC_PAPER="zh_CN.UTF-8"
LC_NAME="zh_CN.UTF-8"
LC_ADDRESS="zh_CN.UTF-8"
LC_TELEPHONE="zh_CN.UTF-8"
LC_MEASUREMENT="zh_CN.UTF-8"
LC_IDENTIFICATION="zh_CN.UTF-8"
LC_ALL=

[ec2-user@ip-10-0-2-41 ~]$ ls
中文python.py 中文目录

[ec2-user@ip-10-0-2-41 ~]$ python 中文python.py
这里是中文
{
  "insun": "泰囧 / 人在囧途2 / Lost in Thailand "
}
[
  {
    "value": "myvalue1",
    "key": "mykey1"
  },
  {
    "country": "中国",
    "name": "张三"
  }
]
```



