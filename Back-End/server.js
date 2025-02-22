const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const UserRouter = require('./Routes/UserRouter');
const authRoutes = require('./Routes/authRouter');

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
app.use('/auth', authRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on ${PORT}`);
});