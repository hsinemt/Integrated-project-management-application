# Endpoint Migration Documentation

## Overview

This document describes the migration of several endpoints from `UserRouter.js` to a new file `UploadRouter.js`. The migration was performed to better organize the codebase by separating upload-related functionality from user management functionality.

## Migrated Endpoints

The following endpoints were moved from `UserRouter.js` to `UploadRouter.js`:

1. **Profile Photo Upload Endpoint**
   - Original: `POST /user/upload-photo`
   - New: `POST /upload/upload-photo`
   - Description: Uploads a profile photo for a user

2. **General Image Upload Endpoint**
   - Original: `POST /user/upload`
   - New: `POST /upload/upload`
   - Description: Uploads a general image for a user

3. **Dashboard Endpoint**
   - Original: `GET /user/dashboard/:role`
   - New: `GET /upload/dashboard/:role`
   - Description: Returns a welcome message for the user's role

4. **Update Profile Endpoint**
   - Original: `PUT /user/update-profile/:userId`
   - New: `PUT /upload/update-profile/:userId`
   - Description: Updates a user's profile information

## Configuration

The multer configuration for file uploads was also moved to `UploadRouter.js`:

```javascript
const storage = multer.diskStorage({
    destination: "uploads/",
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};

const upload = multer({ 
    storage,
    fileFilter,
    limits: {
        fileSize: 4 * 1024 * 1024 // 4MB max file size
    }
});
```

## Server Configuration

The `server.js` file was updated to use the new router:

```javascript
const UserRouter = require('./Routes/UserRouter');
const UploadRouter = require('./Routes/UploadRouter');
// ...

// Route handlers
app.use('/user', UserRouter);
app.use('/upload', UploadRouter);
// ...
```

## Frontend Impact

The frontend code will need to be updated to use the new endpoints. The following changes are required:

1. Update the profile photo upload endpoint from `/user/upload-photo` to `/upload/upload-photo`
2. Update the general image upload endpoint from `/user/upload` to `/upload/upload`
3. Update the dashboard endpoint from `/user/dashboard/:role` to `/upload/dashboard/:role`
4. Update the update profile endpoint from `/user/update-profile/:userId` to `/upload/update-profile/:userId`

## Testing

After making these changes, the following tests should be performed:

1. Upload a profile photo using the new endpoint
2. Upload a general image using the new endpoint
3. Access the dashboard using the new endpoint
4. Update a user's profile using the new endpoint

## Rollback Plan

If issues are encountered, the changes can be rolled back by:

1. Removing the `UploadRouter.js` file
2. Restoring the original endpoints in `UserRouter.js`
3. Removing the `UploadRouter` import and registration from `server.js`