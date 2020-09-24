# How to build Graphics Workstation on Amazon EC2 G4 Instances

This document explains how to build Graphics Workstation on Amazon EC2 G4 Instances. Here use the GPU graphics instance G4 with Windows Server 2016 as example.

## Install NICE DCV Server

Follow up guide [Install NICE DCV Server](EC2/Windows-NICE-DCV-Servers-on-Amazon-EC2.md)

## Install the NVIDIA GPU drivers
1. NVIDIA GPU drivers enable the following:
- DirectX and OpenGL hardware acceleration for applications
- Hardware acceleration for H.264 video streaming encoding
- Customizable server monitor resolutions
- Increased maximum resolution for server monitors— up to 4096x2160
- Increased number of server monitors

The [Installing NVIDIA drivers on Windows instances guide](https://docs.aws.amazon.com/AWSEC2/latest/WindowsGuide/install-nvidia-driver.html)

Choice [NVIDIA drivers that can be used with GPU-based instances](https://docs.aws.amazon.com/AWSEC2/latest/WindowsGuide/install-nvidia-driver.html#nvidia-driver-types)
- Tesla drivers: primarily for compute workloads, such as parallelized floating-point calculations for machine learning and fast Fourier transforms for high performance computing applications.
- GRID drivers: provide optimal performance for professional visualization applications that render content such as 3D models or high-resolution videos. You can configure GRID drivers to support two modes.
  - Quadro Virtual Workstations provide access to four 4K displays per GPU. 
  - GRID vApps provide RDSH App hosting capabilities.
- Gaming drivers: optimizations for gaming and upport a single 4K display per GPU.

The G4 instance support for all Tesla driver, GRID driver and Gaming driver.

2. Installation options
- Option 1: AMIs with the NVIDIA drivers installed from Marketplace. This is can be used for AWS global region
- Option 2: Public NVIDIA drivers: install the public drivers and bring your own license
- Option 3: GRID drivers (G3 and G4 instances): These license are available to AWS customers only
- Option 4: NVIDIA gaming drivers (G4 instances): These license are available to AWS customers only

Here we use the Option 2 for demo

3. Install the NVIDIA Tesla Driver

- Download driver from 
https://s3.cn-north-1.amazonaws.com.cn/lxy-sa-software/EC2-G4-Instance/02_Tesla_Driver/442.50-tesla-desktop-winserver-2019-2016-international.exe

- Select the `Express` installation mode

- Complete the installation

4. [Optimizing GPU settings](https://docs.aws.amazon.com/AWSEC2/latest/WindowsGuide/optimize_gpu.html)
```bash
# Open a PowerShell window and navigate to the NVIDIA installation folder.
cd "C:\Program Files\NVIDIA Corporation\NVSMI"

# Disable the autoboost feature for all GPUs on the instance.
.\nvidia-smi --auto-boost-default=0

# Set all GPU clock speeds to their maximum frequency.  G4 instances:
.\nvidia-smi -ac "5001,1590"
```

![install-nice-dcv-GPU-Setting](EC2/media/install-nice-dcv-GPU-Setting.png)

5. Install Windows components

- Click `Server Manager`
- `Add roles and features`
- `Role-based or feature based installation`
- Select local machine from the Server pool
- Server Role screen, keep default setting
- Feature screnn, select `Media Foundation （媒体基础）` and `Quality Windows Audio Video Experience（优质Windows 音频视频体验）`
- Review and Click `Install`
- Restart the Windows

![Server-Manager](EC2/media/install-nice-dcv-Server-Manager.png)

![Server-Manager-Feature](EC2/media/install-nice-dcv-Server-Manager-Feature.png)

6. Disable the licensing page in the control panel to prevent users from accidentally changing the product type

Run Powershell as Administrator

```bash
New-ItemProperty -Path "HKLM:\SOFTWARE\NVIDIA Corporation\Global\GridLicensing" -Name "NvCplDisableManageLicensePage" -PropertyType "DWord" -Value "1"
```

![DisableManageLicense](EC2/media/install-nice-dcv-DisableManageLicense.png)

7. Install GRID driver

- Download driver from 

https://s3.cn-north-1.amazonaws.com.cn/lxy-sa-software/EC2-G4-Instance/03_Grid_Driver/443.05_grid_win10_64bit_international_whql.exe

- Select the `Express` installation mode

- Complete the installation

8. Disable default display card

9. Make sure the Driver install correctly

- Run Powershell as Administrator

```bash
# Open a PowerShell window and navigate to the NVIDIA installation folder.
cd "C:\Program Files\NVIDIA Corporation\NVSMI"

.\nvidia-smi.exe

.\nvidia-smi.exe -q
```

Output sample

  - Telsa - TCC mode
  - Grid - WDDM

```bash
Tue Sep 22 09:22:32 2020
+-----------------------------------------------------------------------------+
| NVIDIA-SMI 443.05       Driver Version: 443.05       CUDA Version: 10.2     |
|-------------------------------+----------------------+----------------------+
| GPU  Name            TCC/WDDM | Bus-Id        Disp.A | Volatile Uncorr. ECC |
| Fan  Temp  Perf  Pwr:Usage/Cap|         Memory-Usage | GPU-Util  Compute M. |
|===============================+======================+======================|
|   0  Tesla T4           WDDM  | 00000000:00:1E.0 Off |                    0 |
| N/A   40C    P0    27W /  70W |    435MiB / 15360MiB |      1%      Default |
+-------------------------------+----------------------+----------------------+

+-----------------------------------------------------------------------------+
| Processes:                                                       GPU Memory |
|  GPU       PID   Type   Process name                             Usage      |
|=============================================================================|
|    0       920    C+G   C:\Windows\System32\dwm.exe                N/A      |
|    0      2068    C+G   ...t_cw5n1h2txyewy\ShellExperienceHost.exe N/A      |
|    0      2568    C+G   ...dows.Cortana_cw5n1h2txyewy\SearchUI.exe N/A      |
|    0      2800    C+G   ... Files\NICE\DCV\Server\bin\dcvagent.exe N/A      |
|    0      2944    C+G   C:\Windows\explorer.exe                    N/A      |
+-----------------------------------------------------------------------------+
```

- Check the double display

![double-display](EC2/media/install-nice-dcv-double-display.png)

- Disable the default display card

![disable-display-card](EC2/media/install-nice-dcv-disable-display.png)

- High Display Resolution
![high-resolution](EC2/media/install-nice-dcv-high-resolution.png)

10. Test the 3D graphic acceleration

https://s3.cn-north-1.amazonaws.com.cn/lxy-sa-software/EC2-G4-Instance/05_Benchmark/FurMark_1.21.2.0_Setup.exe

![3D-test](EC2/media/install-nice-dcv-3D-test.png)

# Reference
[Installing NVIDIA drivers on Windows instances](https://docs.aws.amazon.com/AWSEC2/latest/WindowsGuide/install-nvidia-driver.html)

