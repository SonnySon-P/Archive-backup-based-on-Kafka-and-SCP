# Archive backup based on Kafka and SCP

基於Kafka和SCP（Secure Copy Protocol）技術，構建穩定高效的異地檔案備份解決方案。

## 壹、基本說明
**一、目標：**
在[Network-Drive-Management-System](https://github.com/SonnySon-P/Network-Drive-Management-System)專案中，實現自架的輕量級雲端硬碟管理平台，支援檔案上傳、下載、刪除與資料結構維護。雲端存儲的核心在於檔案的安全存取，因此異地備份是關鍵保障。本作品提供高安全性與高效能的跨地域檔案備份解決方案，確保數據安全無虞
<br>

**二、開發環境：**
以下爲平台所採用的環境：
* 虛擬機：Docker
* 程式語言：JavaScript
* JavaScript執行環境：Node.js
* Node.js資源管理工具：npm
* 程式編輯器：Visual Studio Code

**三、使用相依套件：**
1. 以下是後端平台所使用的Node.js套件：
* express（Web應用程式架構）
* cors (跨來源資源共用)
* dotenv（將敏感變數放入環境變數中）
* bcrypt（密碼雜湊函式）
* jsonwebtoken（JSON Web Token）
* multer（處理文件上傳到伺服器）
* kafkajs（Apache Kafka Client）

**五、檔案說明：** 
此專案主要延續[Network-Drive-Management-System](https://github.com/SonnySon-P/Network-Drive-Management-System)，主要可分為兩個資料夾Backend資料夾為後端平台的主要程式碼，Frontend資料夾則為前端平台的部分主要程式碼。接下來將對各資料夾中的檔案內容進行詳細說明。
1. Backend
* server.js：為RESTful API與備份檔案的主要程式碼。

2. 

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
cd /opt/kafka/bin
./kafka-topics.sh --create --topic file-events --partitions 1 --replication-factor 1 --bootstrap-server k
afka1:9092
 ./kafka-console-consumer.sh --bootstrap-server kafka1:9092 --topic file-events --from-beginning
# 刪除 topic
./kafka-topics.sh --bootstrap-server kafka1:9092 --delete --topic file-events

# 重新建立 topic
./kafka-topics.sh --bootstrap-server kafka1:9092 --create --topic file-events --partitions 1 --replication-factor 1
# 查詢 topic
./kafka-console-consumer.sh --bootstrap-server kafka1:9092 --topic file-events --from-beginning
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
