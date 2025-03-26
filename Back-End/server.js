const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const UserRouter = require('./Routes/UserRouter');
const cookieParser = require('cookie-parser');
const projectRouter = require('./Routes/ProjectRouter');

require('dotenv').config();
require('./Config/db');

const PORT = process.env.PORT || 9777;

app.get('/', (req, res) => {
    res.send('server is working');
});

app.use(bodyParser.json());
app.use(cookieParser());
app.use(cors({ credentials: true, origin: 'http://localhost:3000' }));
app.use('/user', UserRouter);
app.use('/project', projectRouter);

app.listen(PORT, () => {console.log(`Server is running on ${PORT}`)
});