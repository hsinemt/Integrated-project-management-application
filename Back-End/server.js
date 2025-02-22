const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const UserRouter = require('./Routes/UserRouter');
const cookieParser = require('cookie-parser');

require('dotenv').config();
require('./Config/db');

const PORT = process.env.PORT || 8090;

app.get('/', (req, res) => {
    res.send('server is working');
});

app.use(bodyParser.json());
app.use(cookieParser());
app.use(cors({credentials: true}));
app.use('/user', UserRouter);

app.listen(PORT, () => {console.log(`Server is running on ${PORT}`)
});