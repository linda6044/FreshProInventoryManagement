const mongoose = require('mongoose');
let Schema = mongoose.Schema;

// 用于加载 .env 文件中的环境变量到 Node.js 的 process.env 对象中
require('dotenv').config();

const inventorySchema = new Schema({
    barCode: { type: String, unique: true },
    productName: String,
    brand: String,
    weightInGram: {
        type: Number,
        min: 0,
        validate: {
            validator: Number.isInteger,
            message: '{VALUE} is not an integer value'
        }
    },
    price: { type: Number, min: 0, set: value => Math.round(value * 100) / 100 }, // 保留两位小数
    majorShelfLocation: String,
    alternativeShelfLocation: String
});

let Inventory; // 将在新连接上定义

function initialize() {
    return new Promise(function (resolve, reject) {
        let db = mongoose.createConnection(process.env.MONGODB, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        db.on('error', (err) => {
            reject(err); // 拒绝并返回错误
        });
        db.once('open', () => {
            Inventory = db.model("inventories", inventorySchema); // inventories 是数据库中的集合名称
            resolve();
        });
    });
}

function getProductByKeyWords(string) {
    return new Promise((resolve, reject) => {
        // 使用正则表达式进行不区分大小写的模糊匹配
        Inventory.find({ productName: { $regex: string, $options: 'i' } })
            .then(products => {
                if (products.length > 0) {
                    resolve(products); // 如果找到匹配的产品，返回它们
                } else {
                    resolve([]); // 没有匹配产品，返回空数组
                }
            })
            .catch(err => {
                reject(`Error finding products by keywords: ${err}`); // 捕获任何错误
            });
    });
}

function registerNewProduct(productData) {
    return new Promise((resolve, reject) => {
        let newProduct = new Inventory(productData); // 修正 userData -> productData
        newProduct.save()
            .then(() => resolve())
            .catch((err) => {
                if (err.code === 11000) {
                    console.log("xxxxxxxxxxxxxx");
                    reject("Product already existed");
                } else {
                    reject(`There was an error creating the inventory: ${err}`);
                }
            });
    });
}

module.exports = { initialize, registerNewProduct, getProductByKeyWords}