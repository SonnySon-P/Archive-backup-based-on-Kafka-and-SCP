# Archive backup based on Kafka and SCP

啟動Docker Compose
```bash
cd <docker-compose.yml所在的目錄>
docker-compose up -d kafka1 kafka2
docker-compose up -d express1 express2
```
安裝
```bash
npm install kafkajs
```
創建topics
```bash
./kafka-topics.sh --create --topic file-events --partitions 1 --replication-factor 1 --bootstrap-server k
afka1:9092
```
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
安裝Kafka
```bash
apt update
apt-get install -y openjdk-17-jdk
wget https://dlcdn.apache.org/kafka/4.0.0/kafka-4.0.0-src.tgz
tar -xvzf kafka-4.0.0-src.tgz
cd kafka-4.0.0-src
./gradlew clean releaseTarGz
```
起動Kafka
```bash
bin/kafka-server-start.sh config/kraft/server.properties
```
