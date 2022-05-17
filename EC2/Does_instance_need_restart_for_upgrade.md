# Check if a reboot is required after installing Linux updates

## RedHat / CentOS / Amazon Linux

If you install the `yum-utils` package, you can use a command `needs-restarting`.
You can use it both for checking if a full reboot is required because of kernel or core libraries updates (using the -r option), or what services need to be restarted (using the -s option).
needs-restarting -r returns 0 if reboot is not needed, and 1 if it is.

```bash
sh-4.2$ needs-restarting -r ; echo $?
No core libraries or services have been updated.
Reboot is probably not necessary.
0
```

## Debian / Ubuntu
1. Using helper tool
```bash
sudo apt install needrestart
sudo needrestart -r i
```
2. The system needs a reboot if the file `/var/run/reboot-required` exists
```bash
#!/bin/bash
if [ -f /var/run/reboot-required ]; then
  echo 'reboot required'
fi
```
```bash
cat /var/run/reboot-required.pkgs
```

## OpenSUSE / SLES

`zypper` natively has the ability to find services and processes that need to be restarted.

```
sudo zypper ps
```


