const mongoose = require('mongoose');

const mongo_url = process.env.MONGODB_URL;

if (!mongo_url) {
    console.error('MONGODB_URL environment variable is not defined!');
    console.error('Please set MONGODB_URL in your environment or .env file');
} else {
    mongoose.connect(mongo_url)
        .then(() => {
            console.log('MongoDB Connected Successfully');
        })
        .catch((err) => {
            console.error('MongoDB Connection Error: ', err);
        });
}

module.exports = mongoose;