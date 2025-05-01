# Archive backup based on Kafka and SCP
安裝與啟動SSH
```bash
apt update
apt install openssh-server
service ssh start
```
設定SSH公私鑰
```bash
ssh-keygen -t rsa -b 4096
ssh-copy-id username@remote_host
```
設定SSH密碼
```bash
apt update && apt install -y passwd
cut -d: -f1 /etc/passwd
passwd root
echo "PermitRootLogin yes" | tee -a /etc/ssh/sshd_config
service ssh restart
```
