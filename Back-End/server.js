const express = require('express');
const app = express();
app.use(express.json());
const bodyParser = require('body-parser');
const cors = require('cors');
const UserRouter = require('./Routes/UserRouter');

require('dotenv').config();
require('./Config/db');

const PORT = process.env.PORT || 5000;


app.use(bodyParser.json());
app.use(cors());
app.use('/auth', UserRouter);

app.listen(PORT, () => {console.log(`Server is running on ${PORT}`)
});

