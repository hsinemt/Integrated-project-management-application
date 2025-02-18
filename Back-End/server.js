const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const UserRouter = require('./Routes/UserRouter');

require('dotenv').config();
require('./Config/db');

const PORT = process.env.PORT || 5000;

app.get('/', (req, res) => {
    res.send('server is working');
});
app.use(bodyParser.json());
app.use(cors());
app.use('/user', UserRouter);

app.listen(PORT, () => {console.log(`Server is running on ${PORT}`)
});