# Archive backup based on Kafka and SCP

基於Kafka和SCP（Secure Copy Protocol）技術，構建穩定高效的雲端硬碟異地檔案備份解決方案。

## 壹、基本說明
**一、目標：**
在個人[Network-Drive-Management-System](https://github.com/SonnySon-P/Network-Drive-Management-System)專案中，已實現自架的輕量級雲端硬碟管理平台，支援檔案新增與刪除資料夾，上傳、下載、刪除等資料檔案維護。但雲端存儲的核心在於檔案的安全存取，因此異地備份是關鍵保障。本作品將提供高安全性與高效能的跨地域檔案備份解決方案，確保數據安全無虞。

**二、概念：**
本作品的適用場景涵蓋高效能分散式系統架構。透過Nginx反向代理伺服器（未包含在本作品），可智慧化分流流量至多台後端伺服器，顯著提升系統效能與穩定性。同時，每台後端伺服器擁有獨立的雲端存儲空間，以確保數據的靈活管理。在使用者操作過程中，為保障檔案備份的一致性，系統採用Kafka的Topic機制。每當使用者執行新增或刪除操作，Producer便即時發佈資料夾與檔案變更訊息，Consumer隨即接收並處理，確保同步性與穩定性。此架構不僅有效維持系統一致性，還大幅提升資源利用率，使分散式系統間的檔案同步更加高效。此外，當使用者上傳檔案時，Consumer會在接收到相應的Topic訊息後，透過SCP連接後端伺服器，從使用者的操作伺服器下載指定檔案。

**三、開發環境：**
以下爲後端伺服器所採用的開發環境：
* 虛擬機：Docker
* 程式語言：JavaScript
* JavaScript執行環境：Node.js
* Node.js資源管理工具：npm
* 程式編輯器：Visual Studio Code

**四、使用相依套件：**
以下是後端伺服器所使用的Node.js套件：
* express（Web應用程式架構）
* cors (跨來源資源共用)
* dotenv（將敏感變數放入環境變數中）
* bcrypt（密碼雜湊函式）
* jsonwebtoken（JSON Web Token）
* multer（處理文件上傳到伺服器）
* kafkajs（Apache Kafka Client）
* node-ssh（SSH Client用於遠端命令執行、檔案上傳/下載、系統維護等遠端操作）

**五、檔案說明：** 
本作品的結構主要分為兩個資料夾：Docker Compose及Backend。其中，Docker Compose負責環境架設，包含各項配置文件，用於建立對應的容器。Backend 則為[Network-Drive-Management-System](https://github.com/SonnySon-P/Network-Drive-Management-System)後端程式的延伸與拓展，進一步強化異地備份功能。接下來，將詳細說明各資料夾內的核心檔案內容與用途。
1. Docker Compose
* docker-compose.yml：容器編排工具。
* Dockerfile：定義如何構建Docker容器。
  
2. Backend
* server.js：為RESTful API與備份檔案的主要程式碼。

## 貳、操作說明
**一、安裝程式方式：** 
1. 建立容器
```bash
cd <docker-compose.yml所在的目錄>
docker-compose up -d kafka1 kafka2
docker-compose up -d express1 express2

```
2. 建立容器
```bash
cd <docker-compose.yml所在的目錄>
docker-compose up -d kafka1 kafka2
docker-compose up -d express1 express2 # 建立映像檔完成後，由於會發生閃退問題，請刪除express1、express2，在透過以下指令新增。
docker run --network docker_network -it -p 9083:3095 --name express1 kafka-express1
docker run --network docker_network -it -p 9086:3095 --name express2 kafka-express2
```
3. 在express1、express2安裝與啟動SSH
```bash
apt update
apt install openssh-server
service ssh start
```
4. 設定SSH密碼
```bash
apt update && apt install -y passwd
cut -d: -f1 /etc/passwd
passwd root
echo "PermitRootLogin yes" | tee -a /etc/ssh/sshd_config
service ssh restart
ssh root@express1
```
* 在express1、express2創建一個資料夾，建立專案
```bash
mkdir <資料夾名稱>
cd <資料夾名稱>
npm init -y
```
* 在express1、express2安裝套件
```bash
npm install express
npm install cors
npm install dotenv
npm install bcrypt
npm install jsonwebtoken
npm install multer
npm install kafkajs
npm install node-ssh
npm install nodemon
```
* 在express1、express2創建儲存環境變數檔案.env，內容如下：
```.env
JWT_SECRET_KEY="HlUf$R6Vi0sO1aP"
BCRYPT_SALT_ROUNDS="10"
```
* 在express1、express2複製後端程式server.js，至專案資料夾
* 在express1、express2執行伺服器
```bash
nodemon server.js
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
