const mongoose = require('mongoose');

async function connectDB(){
    try {
        await mongoose.connect(process.env.MONGO_URI)
        console.log("DB Connected successfully")
    } catch (error) {
        console.log("DB connection failed due to :", error)
        process.exit(1); // Exit app if DB fails
    }
}

module.exports = connectDB;