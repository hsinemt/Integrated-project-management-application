# Integrated Project Management Application

## Setup and Installation

### Prerequisites
- Ensure you have **Node.js v22.12.0** installed.
- Install **Git** if you haven't already.

### Step 1: Clone the Repository
```sh
git clone https://github.com/hsinemt/Integrated-project-management-application.git
cd Integrated-project-management-application
```

### Step 2: Initialize Node.js Project
Run the following command to initialize a new Node.js project:
```sh
npm init -y
```

### Step 3: Install Dependencies
Install the necessary Node.js packages:
```sh
npm i express nodemon bcrypt dotenv nodemailer mongoose joi body-parser cookie-parser cors jsonwebtoken
```

### Step 4: Create a `.env` File
Create a `.env` file in the root directory to store environment variables. Example:
```
PORT=8080
```

### Step 5: Run the Project
Use **nodemon** for development:
```sh
npx nodemon server.js
```
Or run with Node.js:
```sh
node server.js
```

### Step 6: API Endpoints
This project uses Express.js for backend services. Define your API routes inside `routes/` and configure your server in `index.js`.

### Additional Notes
- Modify `package.json` to include a script for running the project:
```json
"scripts": {
  "start": "node server.js",
  "dev": "nodemon server.js"
}
```
- Use `npm run dev` to start the project in development mode.

## Contributing
Feel free to submit issues or pull requests to improve the project.

## License
This project is licensed under [MIT License](LICENSE).

