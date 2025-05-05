# Archive backup based on Kafka and SCP

# Network Drive Management System

打造一個簡潔直觀的雲端硬碟管理介面，讓使用者能輕鬆上傳、下載、管理與瀏覽雲端檔案。

## 壹、基本說明
**一、目標：**
本系統為一個可自架的輕量級雲端硬碟管理平台，支援檔案上傳、下載、刪除與資料夾結構維護，適用於個人雲端備份、教學資源分享或企業內部文件整合。前端以Vue.js构建互動式UI，後端則採用Node.js架設RESTful API，搭配MongoDB資料庫，實現即時、彈性的檔案操作流程。
<br>

**二、開發環境：**
以下是開發前後平台所採用的環境：
* 虛擬機：Docker
* 程式語言：JavaScript
* JavaScript執行環境：Node.js
* Node.js資源管理工具：npm
* JavaScript前端框架：Vue.js
* Vue CLI：Vue.js開發環境
* 資料庫：MongoDB
* 程式編輯器：Visual Studio Code
* 測試瀏覽器：Safari（Google Chrome似乎會阻擋報錯，目前未修正）

**三、使用相依套件：**
1. 以下是後端平台所使用的Node.js套件：
* express（Web應用程式架構）
* cors (跨來源資源共用)
* dotenv（將敏感變數放入環境變數中）
* bcrypt（密碼雜湊函式）
* jsonwebtoken（JSON Web Token）
* multer（處理文件上傳到伺服器）

2. 以下是前端平台所使用的Vue.js套件：
* vue-router（前端路由管理器）npm install vue-router@4
* axios（API請求）
* jwt-decode（JWT解碼器）
* bootstrap（CSS框架）

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
