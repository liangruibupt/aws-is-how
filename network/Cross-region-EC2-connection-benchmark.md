# Use the iperf3 to testing the EC2 to EC2 Internet transfer speed benchmark

1. Amazon Linux 2, m5.xlarge 4vCPU, 16GiB RAM, 500GiB gp2 SSD, Up to 10Gbps network bandwidth for both Regions
2. Enable BBR to improve transfer performance https://aws.amazon.com/amazon-linux-ami/2017.09-release-notes/ for both Regions
3. Install iperf
```bash
sudo amazon-linux-extras -y install epel && sudo yum -y install iperf3
```
4. Reference link: https://aws.amazon.com/premiumsupport/knowledge-center/network-throughput-benchmark-linux-ec2/ to see how to use the iperf
5. Start the iperf3 on server side
```bash
iperf3 -s
```
6. Open Security group TCP 5201 and UDP 5201 port on both regions EC2

## From Beijing to Hongkong

| Command | Result |
| ------- | ------ |
| iperf3 -c 18.162.49.78 -P 50 -t 30 | [SUM]   0.00-30.00  sec  8.18 GBytes  2.34 Gbits/sec  5192   sender  </br>[SUM]   0.00-30.00  sec  8.11 GBytes  2.32 Gbits/sec  receiver |
| iperf3 -c 18.162.49.78 -P 50 -t 30 -w 128K | [SUM]   0.00-30.00  sec   677 MBytes   189 Mbits/sec   46  sender  </br> [SUM]   0.00-30.00  sec   674 MBytes   189 Mbits/sec    receiver |
| iperf3 -c 18.162.49.78 -P 50 -t 30 -w 300K | [SUM]   0.00-30.00  sec  1.07 GBytes   307 Mbits/sec   72  sender  </br> [SUM]   0.00-30.00  sec  1.07 GBytes   306 Mbits/sec   receiver |
| iperf3 -c 18.162.49.78 -P 50 -t 30 -w 256K | [SUM]   0.00-30.00  sec  1.08 GBytes   310 Mbits/sec   91  sender </br> [SUM]   0.00-30.00  sec  1.08 GBytes   309 Mbits/sec  receiver  |
| iperf3 -c 18.162.49.78 -P 128 -t 30 | [SUM]   0.00-30.04  sec  11.1 GBytes  3.18 Gbits/sec  624183  sender </br>  [SUM]   0.00-30.04  sec  10.8 GBytes  3.10 Gbits/sec   receiver |


## From Hongkong to Beijing

| Command | Result |
| ------- | ------ |
| iperf3 -c 52.81.27.68 -P 50 -t 30 | [SUM]   0.00-30.00  sec   345 MBytes  96.6 Mbits/sec  84256  sender </br> [SUM]   0.00-30.00  sec   287 MBytes  80.3 Mbits/sec   receiver |
| iperf3 -c 52.81.27.68 -P 50 -t 30 -w 128K | [SUM]   0.00-30.00  sec  98.0 MBytes  27.4 Mbits/sec  22681  sender </br>[SUM]   0.00-30.00  sec  88.7 MBytes  24.8 Mbits/sec  receiver |
| iperf3 -c 52.81.27.68 -P 50 -t 30 -w 300K | [SUM]   0.00-30.00  sec   132 MBytes  36.9 Mbits/sec  26227   sender </br> [SUM]   0.00-30.00  sec   115 MBytes  32.3 Mbits/sec  receiver |
| iperf3 -c 52.81.27.68 -P 50 -t 30 -w 256K | [SUM]   0.00-30.00  sec   173 MBytes  48.4 Mbits/sec  33582  sender </br> [SUM]   0.00-30.00  sec   158 MBytes  44.2 Mbits/sec  receiver  |
| iperf3 -c 52.81.27.68 -P 128 -t 30 | [SUM]   0.00-30.00  sec  1.53 GBytes   437 Mbits/sec  324169   sender </br> [SUM]   0.00-30.00  sec  1.31 GBytes   375 Mbits/sec  receiver |


## From Beijing to Singapore

| Command | Result |
| ------- | ------ |
| iperf3 -c 18.138.232.186 -P 50 -t 30 | [SUM]   0.00-30.00  sec  9.48 GBytes  2.72 Gbits/sec  4994  sender </br> [SUM]   0.00-30.00  sec  9.41 GBytes  2.69 Gbits/sec  receiver |
| iperf3 -c 18.138.232.186 -P 50 -t 30 -w 128K | [SUM]   0.00-30.00  sec   757 MBytes   212 Mbits/sec   46  sender </br> [SUM]   0.00-30.00  sec   754 MBytes   211 Mbits/sec    receiver |
| iperf3 -c 18.138.232.186 -P 50 -t 30 -w 300K | [SUM]   0.00-30.00  sec  1.19 GBytes   342 Mbits/sec  1228  sender </br>[SUM]   0.00-30.00  sec  1.19 GBytes   341 Mbits/sec   receiver |
| iperf3 -c 18.138.232.186 -P 50 -t 30 -w 256K | [SUM]   0.00-30.00  sec  1.21 GBytes   347 Mbits/sec  207  sender </br> [SUM]   0.00-30.00  sec  1.21 GBytes   346 Mbits/sec  receiver  |
| iperf3 -c 18.138.232.186 -P 128 -t 30 | [SUM]   0.00-30.02  sec  12.4 GBytes  3.56 Gbits/sec  783460   sender </br> [SUM]   0.00-30.02  sec  12.1 GBytes  3.46 Gbits/sec   receiver |


## From Singapore to Beijing

| Command | Result |
| ------- | ------ |
| iperf3 -c 52.81.27.68 -P 50 -t 30 | [SUM]   0.00-30.00  sec   260 MBytes  72.6 Mbits/sec  72951   sender </br> [SUM]   0.00-30.00  sec   218 MBytes  61.0 Mbits/sec  receiver |
| iperf3 -c 52.81.27.68 -P 50 -t 30 -w 128K | [SUM]   0.00-30.00  sec  75.5 MBytes  21.1 Mbits/sec  21520  sender </br> [SUM]   0.00-30.00  sec  65.4 MBytes  18.3 Mbits/sec   receiver |
| iperf3 -c 52.81.27.68 -P 50 -t 30 -w 300K | [SUM]   0.00-30.00  sec   110 MBytes  30.7 Mbits/sec  30971  sender </br> [SUM]   0.00-30.00  sec  93.3 MBytes  26.1 Mbits/sec  receiver |
| iperf3 -c 52.81.27.68 -P 50 -t 30 -w 256K |  [SUM]   0.00-30.00  sec   116 MBytes  32.4 Mbits/sec  31653  sender </br> [SUM]   0.00-30.00  sec  99.8 MBytes  27.9 Mbits/sec receiver |
| iperf3 -c 52.81.27.68 -P 128 -t 30 | [SUM]   0.00-30.00  sec   697 MBytes   195 Mbits/sec  182510   sender </br> [SUM]   0.00-30.00  sec   589 MBytes   165 Mbits/sec   receiver |
