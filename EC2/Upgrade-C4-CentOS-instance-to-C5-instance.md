# Upgrade C4 CentOS instance to C5 instance

## Launch c4.4xlarge instance 
 - AMI Name: CentOS-7.5.1804 (China MarketPlace)
 - Root Volume: EBS 50 GB
 - Data Volume: 2 volumes with 50 GB per each
 - Using other default setting


## Check instance
```bash
instance_id=i-04731d4fe6fb15a0a
ami_id=ami-0bc58369e23885cd0
my_ec2_ip=54.223.228.47
```
- Check the ENA Support
```bash
aws ec2 describe-instances --instance-ids $instance_id --query "Reservations[].Instances[].EnaSupport" --region cn-north-1 --profile china_ruiliang
[
    true
]

aws ec2 describe-images --image-id $ami_id --query "Images[].EnaSupport" --region cn-north-1 --profile china_ruiliang
[
    true
]
aws ec2 describe-instances --instance-ids $instance_id --query "Reservations[].Instances[].State" --region cn-north-1 --profile china_ruiliang
[
    {
        "Code": 16,
        "Name": "running"
    }
]
[
    [
        {
            "Details": [
                {
                    "Name": "reachability",
                    "Status": "passed"
                }
            ],
            "Status": "ok"
        },
        {
            "Details": [
                {
                    "Name": "reachability",
                    "Status": "passed"
                }
            ],
            "Status": "ok"
        }
    ]
]

ssh -A centos@$my_ec2_ip
[centos@ip-172-31-15-226 ~]$ modinfo ena
filename:       /lib/modules/3.10.0-862.3.2.el7.x86_64/extra/ena.ko.xz
version:        2.1.0g
license:        GPL
description:    Elastic Network Adapter (ENA)
author:         Amazon.com, Inc. or its affiliates
retpoline:      Y
rhelversion:    7.5
srcversion:     DF36FD877CC81A3596E9C8C
alias:          pci:v00001D0Fd0000EC21sv*sd*bc*sc*i*
alias:          pci:v00001D0Fd0000EC20sv*sd*bc*sc*i*
alias:          pci:v00001D0Fd00001EC2sv*sd*bc*sc*i*
alias:          pci:v00001D0Fd00000EC2sv*sd*bc*sc*i*
depends:
vermagic:       3.10.0-862.3.2.el7.x86_64 SMP mod_unload modversions
parm:           debug:Debug level (0=none,...,16=all) (int)
parm:           rx_queue_size:Rx queue size. The size should be a power of 2. Max value is 8K
 (int)
parm:           force_large_llq_header:Increases maximum supported header size in LLQ mode to 224 bytes, while reducing the maximum TX queue size by half.
 (int)


[centos@ip-172-31-15-226 ~]$ ethtool -i eth0
driver: vif
version:
firmware-version:
expansion-rom-version:
bus-info: vif-0
supports-statistics: yes
supports-test: no
supports-eeprom-access: no
supports-register-dump: no
supports-priv-flags: no

[centos@ip-172-31-15-226 ~]$ exit
```

- Check NVMe
```bash
[centos@ip-172-31-15-226 ~]$ modinfo nvme
filename:       /lib/modules/3.10.0-862.3.2.el7.x86_64/kernel/drivers/nvme/host/nvme.ko.xz
version:        1.0
license:        GPL
author:         Matthew Wilcox <willy@linux.intel.com>
retpoline:      Y
rhelversion:    7.5
srcversion:     30450E89667604AF8B90469
alias:          pci:v*d*sv*sd*bc01sc08i02*
alias:          pci:v0000144Dd0000A822sv*sd*bc*sc*i*
alias:          pci:v0000144Dd0000A821sv*sd*bc*sc*i*
alias:          pci:v00001C5Fd00000540sv*sd*bc*sc*i*
alias:          pci:v00001C58d00000003sv*sd*bc*sc*i*
alias:          pci:v00008086d00005845sv*sd*bc*sc*i*
alias:          pci:v00008086d0000F1A5sv*sd*bc*sc*i*
alias:          pci:v00008086d00000A55sv*sd*bc*sc*i*
alias:          pci:v00008086d00000A54sv*sd*bc*sc*i*
alias:          pci:v00008086d00000A53sv*sd*bc*sc*i*
alias:          pci:v00008086d00000953sv*sd*bc*sc*i*
depends:        nvme-core
intree:         Y
vermagic:       3.10.0-862.3.2.el7.x86_64 SMP mod_unload modversions
signer:         CentOS Linux kernel signing key
sig_key:        D8:74:54:18:48:B9:21:C5:E0:40:01:F8:06:AC:D0:6C:EB:48:1C:7C
sig_hashalgo:   sha256
parm:           use_threaded_interrupts:int
parm:           use_cmb_sqes:use controller's memory buffer for I/O SQes (bool)
parm:           max_host_mem_size_mb:Maximum Host Memory Buffer (HMB) size per controller (in MiB) (uint)
parm:           io_queue_depth:set io queue depth, should >= 2

[centos@ip-172-31-15-226 ~]$ lsblk
NAME    MAJ:MIN RM SIZE RO TYPE MOUNTPOINT
xvda    202:0    0  50G  0 disk
`-xvda1 202:1    0  50G  0 part /
xvdb    202:16   0  50G  0 disk
xvdc    202:32   0  50G  0 disk
```

## Directly change c4.4xlarge to c5.4xlarge
```bash
aws ec2 stop-instances --instance-ids $instance_id --region cn-north-1 --profile china_ruiliang
aws ec2 modify-instance-attribute --instance-id $instance_id --instance-type c5.4xlarge --region cn-north-1 --profile china_ruiliang
aws ec2 modify-instance-attribute --instance-id $instance_id --ena-support --region cn-north-1 --profile china_ruiliang
aws ec2 start-instances --instance-i $instance_id --region cn-north-1 --profile china_ruiliang

```
- Check the new instance
```bash
aws ec2 describe-instances --instance-ids $instance_id --query "Reservations[].Instances[].State" --region cn-north-1 --profile china_ruiliang
aws ec2 describe-instance-status --instance-ids $instance_id --query "InstanceStatuses[].[SystemStatus,InstanceStatus]" --region cn-north-1 --profile china_ruiliang

my_ec2_ip=52.81.206.196
ssh -A centos@$my_ec2_ip
[centos@ip-172-31-15-226 ~]$ modinfo ena
filename:       /lib/modules/3.10.0-862.3.2.el7.x86_64/extra/ena.ko.xz
version:        2.1.0g
license:        GPL
description:    Elastic Network Adapter (ENA)
author:         Amazon.com, Inc. or its affiliates
retpoline:      Y
rhelversion:    7.5
srcversion:     DF36FD877CC81A3596E9C8C
alias:          pci:v00001D0Fd0000EC21sv*sd*bc*sc*i*
alias:          pci:v00001D0Fd0000EC20sv*sd*bc*sc*i*
alias:          pci:v00001D0Fd00001EC2sv*sd*bc*sc*i*
alias:          pci:v00001D0Fd00000EC2sv*sd*bc*sc*i*
depends:
vermagic:       3.10.0-862.3.2.el7.x86_64 SMP mod_unload modversions
parm:           debug:Debug level (0=none,...,16=all) (int)
parm:           rx_queue_size:Rx queue size. The size should be a power of 2. Max value is 8K
 (int)
parm:           force_large_llq_header:Increases maximum supported header size in LLQ mode to 224 bytes, while reducing the maximum TX queue size by half.
 (int)

[centos@ip-172-31-15-226 ~]$ ethtool -i eth0
driver: ena
version: 2.1.0g
firmware-version:
expansion-rom-version:
bus-info: 0000:00:05.0
supports-statistics: yes
supports-test: no
supports-eeprom-access: no
supports-register-dump: no
supports-priv-flags: no
```

- Check NVMe
```bash
[centos@ip-172-31-15-226 ~]$ modinfo nvme
filename:       /lib/modules/3.10.0-862.3.2.el7.x86_64/kernel/drivers/nvme/host/nvme.ko.xz
version:        1.0
license:        GPL
author:         Matthew Wilcox <willy@linux.intel.com>
retpoline:      Y
rhelversion:    7.5
srcversion:     30450E89667604AF8B90469
alias:          pci:v*d*sv*sd*bc01sc08i02*
alias:          pci:v0000144Dd0000A822sv*sd*bc*sc*i*
alias:          pci:v0000144Dd0000A821sv*sd*bc*sc*i*
alias:          pci:v00001C5Fd00000540sv*sd*bc*sc*i*
alias:          pci:v00001C58d00000003sv*sd*bc*sc*i*
alias:          pci:v00008086d00005845sv*sd*bc*sc*i*
alias:          pci:v00008086d0000F1A5sv*sd*bc*sc*i*
alias:          pci:v00008086d00000A55sv*sd*bc*sc*i*
alias:          pci:v00008086d00000A54sv*sd*bc*sc*i*
alias:          pci:v00008086d00000A53sv*sd*bc*sc*i*
alias:          pci:v00008086d00000953sv*sd*bc*sc*i*
depends:        nvme-core
intree:         Y
vermagic:       3.10.0-862.3.2.el7.x86_64 SMP mod_unload modversions
signer:         CentOS Linux kernel signing key
sig_key:        D8:74:54:18:48:B9:21:C5:E0:40:01:F8:06:AC:D0:6C:EB:48:1C:7C
sig_hashalgo:   sha256
parm:           use_threaded_interrupts:int
parm:           use_cmb_sqes:use controller's memory buffer for I/O SQes (bool)
parm:           max_host_mem_size_mb:Maximum Host Memory Buffer (HMB) size per controller (in MiB) (uint)
parm:           io_queue_depth:set io queue depth, should >= 2

[centos@ip-172-31-15-226 ~]$ lsblk
NAME        MAJ:MIN RM SIZE RO TYPE MOUNTPOINT
nvme0n1     259:2    0  50G  0 disk
`-nvme0n1p1 259:3    0  50G  0 part /
nvme1n1     259:0    0  50G  0 disk
nvme2n1     259:1    0  50G  0 disk
```

## Reference
[Change the instance type](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-resize.html)

[Enable ENA on EC2](https://docs.aws.amazon.com/zh_cn/AWSEC2/latest/UserGuide/enhanced-networking-ena.html#ena-performance)

[How do I enable and configure enhanced networking on my EC2 instances?](https://aws.amazon.com/cn/premiumsupport/knowledge-center/enable-configure-enhanced-networking/)

[nvme-ebs-volumes](https://docs.aws.amazon.com/zh_cn/AWSEC2/latest/UserGuide/nvme-ebs-volumes.html)