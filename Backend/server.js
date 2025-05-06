// 載入環境變數
require("dotenv").config();

// 載入套件
const express = require("express");
const multer = require("multer");
const { MongoClient, ObjectId } = require("mongodb");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
const { Kafka, Partitioners } = require("kafkajs");
const { NodeSSH } = require("node-ssh");

// 宣告變數
const app = express();
const ssh = new NodeSSH();

// 設定port
const port = 3095;

// 設定MongoDB
const uri = "mongodb://172.18.0.4";  // MongoDB位址
const dbName = "ndmi";  // 資料庫名稱
const client = new MongoClient(uri);  // 建立一個MongoDB的客戶端物件

// 設定Kafka2客戶端，連接到Kafka2 Broker
const kafka = new Kafka({
    clientId: "kafka2-client",  // 需根據容器狀況，適時更改名稱
    brokers: ["kafka2:9092"], // 使用PLAINTEXT端口，需根據容器對應brokers
    requestTimeout: 30000,
    enforceRequestTimeout: true,
    apiVersions: "auto" // 讓KafkaJS自動匹配API版本
});

// 創建Producer實例
const producer = kafka.producer({
    createPartitioner: Partitioners.LegacyPartitioner
});

// Producer發佈訊息
const runProducer = async (entry) => {
    await producer.connect();
  
    try {
      await producer.send({
        topic: "file-events",
        messages: [
            { value: JSON.stringify(entry) }
        ],
      });
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
        await producer.disconnect(); // 確保Producer斷開連接
    }
};

// 創建Consumer實例
const consumer = kafka.consumer({ 
    groupId: "test-group" // Consumer群組的識別碼
});

// Consumer獲取訊息
const runConsumer = async () => {
    await consumer.connect();

    try {
        await consumer.subscribe({
            topic: "file-events",
            fromBeginning: false,  // 只讀取新消息
        });
    } catch (err) {
        console.error("Error subscribing to topic:", err);
        return;
    }

    await consumer.run({
        autoCommit: false,
        eachMessage: async ({ message }) => {
            try {
                const { action, path } = JSON.parse(message.value.toString());

                // 根據action執行相應的函數
                if (action === "createFolder") {
                    createFolder(2, path);
                } else if (action === "deleteFolder") {
                    deleteFolder(2, path);
                } else if (action === "uploadFile") {
                    uploadFile(path);
                } else if (action === "deleteFile") {
                    deleteFile(2, path);
                }
                console.log("Committing offset:", Number(message.offset) + 1);

                // 確保提交正確的offset，避免消息重複處理
                await consumer.commitOffsets([
                    { 
                        topic: message.topic, 
                        partition: message.partition, 
                        offset: (Number(message.offset) + 1).toString(),
                    },
                ]);
            } catch (err) {
                console.error("Error processing message:", err);
            }
        },
    });
};

// 中介軟體
app.use(express.static("public"));  // 設定靜態資源路徑
app.use(express.json());  // 解析JSON格式的請求
app.use(cors());  // 啟用跨來源請求

// 啟動伺服器的主流程
async function startServer() {
    try {
        // 連線資料庫
        await client.connect();
        const db = client.db(dbName);

        // 新增用戶
        app.post("/users", async (req, res) => {
            const { name, email, password } = req.body;
            if (!name || !email || !password) {
                return res.status(400).json({ error: "Missing name, email or password"});
            }

            try {
                const createUserResult = await db.collection("users").insertOne({ 
                    name, 
                    email, 
                    password: bcrypt.hashSync(password, parseInt(process.env.BCRYPT_SALT_ROUNDS))
                });

                const folderPath = path.join(__dirname, "../Cloud Drive/", name); 
                const createFolderResult = await createFolder(1, folderPath);

                return res.status(200).json({ message: "User created successfully" });
            } catch (err) {
                if (err.error === "Failed to create folder") {
                    return res.status(500).json({ error: err.error });
                }
                return res.status(500).json({ error: "Failed to create user" });
            }
        });

        // 更新用戶
        app.put("/users/:id", async (req, res) => {
            try {
                const authHeader = req.header("authorization");
        
                if (!authHeader) {
                    return res.status(400).json({ error: "Missing token" });
                }
        
                const tokenParts = authHeader.split(" ");
                if (tokenParts.length !== 2 || tokenParts[0] !== "Bearer") {
                    return res.status(400).json({ error: "Invalid token format. Expected: Bearer <token>" });
                }
        
                const verifyToken = (token) => {
                    return new Promise((resolve, reject) => {
                        jwt.verify(token, process.env.JWT_SECRET_KEY, (err, payload) => {
                            if (err) {
                                reject(err);
                            } else {
                                resolve(payload);
                            }
                        });
                    });
                };
        
                const payload = await verifyToken(tokenParts[1]);
        
                if (Math.floor(new Date().getTime() / 1000) > payload.exp) {
                    return res.status(401).json({ error: "Token has expired" });
                }
        
                const userID = req.params.id;
                const { name, email, password } = req.body;
        
                const updateFields = {};
                if (name) updateFields.name = name;
                if (email) updateFields.email = email;
                if (password) updateFields.password = bcrypt.hashSync(password, parseInt(process.env.BCRYPT_SALT_ROUNDS));
        
                try {
                    const result = await db.collection("users").updateOne(
                        { _id: new ObjectId(userID) },
                        { $set: updateFields }
                    );
                    if (result.matchedCount === 0) {
                        return res.status(404).json({ error: "User not found" });
                    }
                    return res.status(200).json({ message: "User updated successfully" });
                } catch (err) {
                    return res.status(500).json({ error: "Failed to update user" });
                }
            } catch (err) {
                return res.status(500).json({ error: "Failed to process request" });
            }
        });
        
        // 用戶登入
        app.post("/login", async (req, res) => {
            const { email, password } = req.body;
            if (!email || !password) {
                return res.status(400).json({ error: "Missing email or password" });
            }
        
            try {
                const loginResult = await db.collection("users").findOne({ email });
                if (!loginResult) {
                    return res.status(404).json({ error: "User not found" });
                }

                if (!bcrypt.compareSync(password, loginResult.password)) {
                    return res.status(401).json({ error: "Authentication failed" });
                }

                const payload = {
                    _id: loginResult._id,
                    name: loginResult.name,
                    email: loginResult.email,
                    iat: Math.floor(Date.now() / 1000),
                    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 // 有效期1天
                };
 
                return res.status(200).json({
                    message: "Login successful",
                    token: jwt.sign(payload, process.env.JWT_SECRET_KEY)
                });
            } catch (err) {
                return res.status(500).json({ error: "Failed to process login" });
            }
        });

        // 取得雲端硬碟檔案清單
        app.get("/files", async (req, res) => {
            try {
                const authHeader = req.header("authorization");
        
                if (!authHeader) {
                    return res.status(400).json({ error: "Missing token" });
                }
        
                const tokenParts = authHeader.split(" ");
                if (tokenParts.length !== 2 || tokenParts[0] !== "Bearer") {
                    return res.status(400).json({ error: "Invalid token format. Expected: Bearer <token>" });
                }
        
                const verifyToken = (token) => {
                    return new Promise((resolve, reject) => {
                        jwt.verify(token, process.env.JWT_SECRET_KEY, (err, payload) => {
                            if (err) {
                                reject(err);
                            } else {
                                resolve(payload);
                            }
                        });
                    });
                };
        
                const payload = await verifyToken(tokenParts[1]);
        
                if (Math.floor(new Date().getTime() / 1000) > payload.exp) {
                    return res.status(401).json({ error: "Token has expired" });
                }
                
                const drivePath = path.join(__dirname, "../Cloud Drive/", req.query.path);

                if (!fs.existsSync(drivePath)) {
                    return res.status(404).json({ error: "User drive folder not found" });
                }

                fs.readdir(drivePath, (err, files) => {
                    if (err) {
                        return res.status(401).json({ error: "Failed to read the file" });
                    }

                    const fileDetails = [];

                    if (files.length === 0) {
                        return res.status(200).json(fileDetails);  // 空的數組返回200
                    }

                    files.forEach(file => {
                        const filePath = path.join(drivePath, file);

                        fs.lstat(filePath, (err, stats) => {
                            if (err) {
                                return res.status(500).json({ error: "Failed to get file stats" });
                            }

                            fileDetails.push({
                                name: file,
                                isFolder: stats.isDirectory(), // 如果是資料夾，isDirectory()為true
                            });

                            if (fileDetails.length === files.length) {
                                return res.status(200).json(fileDetails);
                            }
                        });
                    });
                });   
            } catch (err) {
                return res.status(500).json({ error: "Failed to process request" });
            }
        });

        // 新增資料夾
        app.post("/create-folder", async (req, res) => {
            try {
                const authHeader = req.header("authorization");
        
                if (!authHeader) {
                    return res.status(400).json({ error: "Missing token" });
                }
        
                const tokenParts = authHeader.split(" ");
                if (tokenParts.length !== 2 || tokenParts[0] !== "Bearer") {
                    return res.status(400).json({ error: "Invalid token format. Expected: Bearer <token>" });
                }
        
                const verifyToken = (token) => {
                    return new Promise((resolve, reject) => {
                        jwt.verify(token, process.env.JWT_SECRET_KEY, (err, payload) => {
                            if (err) {
                                reject(err);
                            } else {
                                resolve(payload);
                            }
                        });
                    });
                };
        
                const payload = await verifyToken(tokenParts[1]);
        
                if (Math.floor(new Date().getTime() / 1000) > payload.exp) {
                    return res.status(401).json({ error: "Token has expired" });
                }

                const drivePath = path.join(__dirname, "../Cloud Drive/", req.body.path);          
                if (!fs.existsSync(drivePath)) {
                    return res.status(404).json({ error: "Folder not found" });
                }
                
                const folderPath = path.join(drivePath, req.body.folderName);
                try {
                    const createFolderResult = await createFolder(1, folderPath);
                    return res.status(200).json({ message: "Folder created successfully", folder: createFolderResult.message });
                } catch (err) {
                    return res.status(500).json({ error: "Failed to create folder", details: err.message });
                }
            } catch (err) {
                return res.status(500).json({ error: "Failed to process request" });
            }
        });

        // 刪除資料夾
        app.delete("/delete-folder", async (req, res) => {
            try {
                const authHeader = req.header("authorization");
        
                if (!authHeader) {
                    return res.status(400).json({ error: "Missing token" });
                }
        
                const tokenParts = authHeader.split(" ");
                if (tokenParts.length !== 2 || tokenParts[0] !== "Bearer") {
                    return res.status(400).json({ error: "Invalid token format. Expected: Bearer <token>" });
                }

                const verifyToken = (token) => {
                    return new Promise((resolve, reject) => {
                        jwt.verify(token, process.env.JWT_SECRET_KEY, (err, payload) => {
                            if (err) {
                                reject(err);
                            } else {
                                resolve(payload);
                            }
                        });
                    });
                };
        
                const payload = await verifyToken(tokenParts[1]);
        
                if (Math.floor(new Date().getTime() / 1000) > payload.exp) {
                    return res.status(401).json({ error: "Token has expired" });
                }

                let folderPath = path.join(__dirname, "../Cloud Drive/", req.query.path);              
                if (!fs.existsSync(folderPath)) {
                    return res.status(404).json({ error: "Folder not found" });
                }

                try {
                    const deleteFolderResult = await deleteFolder(1, folderPath);
                    return res.status(200).json({ message: "Folder delete successfully", folder: deleteFolderResult.message });
                } catch (err) {
                    return res.status(500).json({ error: "Failed to delete folder", details: err.message });
                }
            } catch (err) {
                return res.status(500).json({ error: "Failed to process request" });
            }
        });

        // 上傳檔案
        const upload = multer({ storage: multer.memoryStorage() });
        app.post("/upload-file", upload.single("file"), async (req, res) => {
          try {
            const authHeader = req.header("authorization");
        
            if (!authHeader) {
              return res.status(400).json({ error: "Missing token" });
            }
        
            const tokenParts = authHeader.split(" ");
            if (tokenParts.length !== 2 || tokenParts[0] !== "Bearer") {
              return res.status(400).json({ error: "Invalid token format. Expected: Bearer <token>" });
            }
        
            const verifyToken = (token) => {
                return new Promise((resolve, reject) => {
                    jwt.verify(token, process.env.JWT_SECRET_KEY, (err, payload) => {
                        if (err) {
                            reject(err);
                        } else {
                            resolve(payload);
                        }
                    });
                });
            };
    
            const payload = await verifyToken(tokenParts[1]);
    
            if (Math.floor(new Date().getTime() / 1000) > payload.exp) {
                return res.status(401).json({ error: "Token has expired" });
            }
        
            const relativePath = req.body.path || "";
            const folderPath = path.join(__dirname, "../Cloud Drive/", relativePath);
    
            if (!fs.existsSync(folderPath)) {
            return res.status(404).json({ error: "Folder not found" });
            }
    
            if (!req.file) {
            return res.status(400).json({ error: "No file uploaded" });
            }
    
            const filePath = path.join(folderPath, req.file.originalname);
    
            fs.writeFile(filePath, req.file.buffer, (err) => {
                if (err) {
                    return res.status(500).json({ error: "Failed to save file" });
                }
                
                const entry = { action: "uploadFile", path: filePath };
                runProducer(entry);
                
                return res.status(200).json({ message: "File uploaded successfully" });
            });
          } catch (err) {
            return res.status(500).json({ error: "Failed to process request" });
          }
        });

        // 下載檔案
        app.get("/download-file", async (req, res) => {
            try {
                const authHeader = req.header("authorization");
        
                if (!authHeader) {
                    return res.status(400).json({ error: "Missing token" });
                }
        
                const tokenParts = authHeader.split(" ");
                if (tokenParts.length !== 2 || tokenParts[0] !== "Bearer") {
                    return res.status(400).json({ error: "Invalid token format. Expected: Bearer <token>" });
                }
        
                const verifyToken = (token) => {
                    return new Promise((resolve, reject) => {
                        jwt.verify(token, process.env.JWT_SECRET_KEY, (err, payload) => {
                            if (err) {
                                reject(err);
                            } else {
                                resolve(payload);
                            }
                        });
                    });
                };
        
                const payload = await verifyToken(tokenParts[1]);
        
                if (Math.floor(new Date().getTime() / 1000) > payload.exp) {
                    return res.status(401).json({ error: "Token has expired" });
                }

                let filePath = path.join(__dirname, "../Cloud Drive/", req.query.path);

                if (!fs.existsSync(filePath)) {
                    return res.status(404).json({ error: "File not found" });
                }

                res.download(filePath, (err) => {
                    if (err) {
                        return res.status(500).json({ error: "File download failed" });
                    }
                });
            } catch (err) {
                return res.status(500).json({ error: "Failed to process request" });
            }
        });

        // 刪除檔案
        app.delete("/delete-file", async (req, res) => {
            try {
                const authHeader = req.header("authorization");
        
                if (!authHeader) {
                    return res.status(400).json({ error: "Missing token" });
                }
        
                const tokenParts = authHeader.split(" ");
                if (tokenParts.length !== 2 || tokenParts[0] !== "Bearer") {
                    return res.status(400).json({ error: "Invalid token format. Expected: Bearer <token>" });
                }
        
                const verifyToken = (token) => {
                    return new Promise((resolve, reject) => {
                        jwt.verify(token, process.env.JWT_SECRET_KEY, (err, payload) => {
                            if (err) {
                                reject(err);
                            } else {
                                resolve(payload);
                            }
                        });
                    });
                };
        
                const payload = await verifyToken(tokenParts[1]);
        
                if (Math.floor(new Date().getTime() / 1000) > payload.exp) {
                    return res.status(401).json({ error: "Token has expired" });
                }
                    
                let filePath = path.join(__dirname, "../Cloud Drive/", req.query.path);            
                if (!fs.existsSync(filePath)) {
                    return res.status(404).json({ error: "File not found" });
                }

                try {
                    const deleteFileResult = await deleteFile(1, filePath);
                    return res.status(200).json({ message: "File delete successfully", folder: deleteFileResult.message });
                } catch (err) {
                    return res.status(500).json({ error: "Failed to delete File", details: err.message });
                }
            } catch (err) {
                return res.status(500).json({ error: "Failed to process request" });
            }
        });

        // 啟動Express應用程式
        app.listen(port, () => {
            console.log(`Server running on port ${port}.`);
        });
    } catch (err) {
        console.error("Failed to connect to MongoDB:", err);
        process.exit(1); // 強制中止，避免Express在沒連上資料庫下啟動
    }
}

// 創建資料夾
function createFolder(type, folderPath) {
    return new Promise((resolve, reject) => {
        fs.mkdir(folderPath, { recursive: true }, (err) => {
            if (err) {
                reject({ error: "Failed to create folder" });
            } else {
                if (type === 1) {
                    const entry = { action: "createFolder", path: folderPath };
                    runProducer(entry);
                    resolve({ message: "Folder created successfully" });
                }
            }
        });
    });
}

// 刪除資料夾
function deleteFolder(type, folderPath) {
    return new Promise((resolve, reject) => {
        fs.rm(folderPath, { recursive: true }, (err) => {
            if (err) {
                reject({ error: "Failed to delete folder" });
            } else {
                if (type === 1) {
                    const entry = { action: "deleteFolder", path: folderPath };
                    runProducer(entry);
                    resolve({ message: "Folder deleted successfully" });
                }
            }
        });
    });
}

// 上傳檔案
function uploadFile(filePath) {
    return new Promise((resolve, reject) => {
        ssh.connect({
            host: "express1",
            username: "root",
            password: "12345678"
        })
        .then(() => {
            console.log("Connected successfully to the remote server!");
            return ssh.getFile(filePath, filePath);
        })
        .then(() => {
            console.log("File downloaded successfully!");
            ssh.dispose();
            resolve();
        })
        .catch((err) => {
            console.error("Error:", err);
            ssh.dispose();
            reject(err);
        });
    });
}

// 刪除檔案
function deleteFile(type, filePath) {
    return new Promise((resolve, reject) => {
        fs.unlink(filePath, (err) => {
            if (err) {
                reject({ error: "File deletion failed" });
            } else {
                if (type === 1) {
                    const entry = { action: "deleteFile", path: filePath };
                    runProducer(entry);
                    resolve({ message: "File deleted successfully" });
                }
            }
        });
    });
}

// 啟動Server與運行Consumer
startServer();
runConsumer();
