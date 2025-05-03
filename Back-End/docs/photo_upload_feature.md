# Photo Upload Feature Documentation

## Overview

This document describes the photo upload feature implemented in the academic management system. The feature allows uploading user profile photos during user creation and updates.

## Features

- Upload profile photos during user creation
- Upload profile photos during user profile updates
- Preview uploaded images before submission
- Validation for file types and size
- Visual feedback during upload process
- Default avatar fallback when no photo is uploaded

## Technical Implementation

### Backend

#### API Endpoints

1. **Upload Profile Photo**
   - Endpoint: `POST /user/upload-photo`
   - Description: Uploads a profile photo for the authenticated user or for a specific user (admin only)
   - Authentication: Required
   - Request:
     - Headers: `Authorization: Bearer <token>`
     - Body: FormData with `image` field containing the photo file
     - Optional: `userId` field to specify a user (admin only)
   - Response: JSON with success status, message, image URL, and updated user data

2. **Update User with Photo**
   - Endpoint: `PUT /user/update-with-photo/:id`
   - Description: Updates a user's information and profile photo
   - Authentication: Required (admin only)
   - Request:
     - Headers: `Authorization: Bearer <token>`
     - Body: FormData with user data and optional `photo` field containing the photo file
   - Response: JSON with success status, message, and updated user data

3. **Create User with Photo**
   - Endpoints:
     - `POST /user/addManagerWithPhoto`
     - `POST /user/addTutorWithPhoto`
     - `POST /user/addStudentWithPhoto`
   - Description: Creates a new user with a profile photo
   - Authentication: Required (admin only)
   - Request:
     - Headers: `Authorization: Bearer <token>`
     - Body: FormData with user data and optional `photo` field containing the photo file
   - Response: JSON with success status, message, and created user data

#### File Storage

- Photos are stored in the `uploads/` directory on the server
- Filenames are generated using the current timestamp and the original file extension
- Only image files are accepted (MIME types starting with 'image/')
- Maximum file size is 4MB

### Frontend

#### API Functions

1. **uploadUserPhoto**
   - Description: Uploads a profile photo for a user
   - Parameters:
     - `file`: The image file to upload
     - `userId` (optional): The ID of the user to update (if not provided, updates the authenticated user)

2. **createUserWithPhoto**
   - Description: Creates a new user with a profile photo
   - Parameters:
     - `file`: The image file to upload (or null if no photo)
     - `userData`: The user data for creation
     - `userType`: The type of user being created ('manager', 'tutor', or 'student')

3. **updateUserWithPhoto**
   - Description: Updates a user with a new profile photo
   - Parameters:
     - `userId`: The ID of the user to update
     - `userData`: The user data to update
     - `file`: The new profile photo (or null if no photo)

#### UI Components

1. **Add User Form**
   - Displays a preview of the selected image
   - Provides a file input for selecting an image
   - Validates file type and size
   - Shows error messages for invalid files
   - Provides visual feedback during upload

2. **Edit User Form**
   - Displays the user's current profile photo or a default avatar
   - Provides a file input for selecting a new image
   - Validates file type and size
   - Shows error messages for invalid files
   - Provides visual feedback during upload

## User Experience

1. **Adding a New User with Photo**
   - Admin clicks "Add User" button
   - Admin fills in user details
   - Admin clicks "Upload" button in the profile image section
   - Admin selects an image file
   - A preview of the image appears
   - Admin clicks "Add User" button to submit the form
   - The user is created with the uploaded profile photo

2. **Updating a User's Profile Photo**
   - Admin clicks the edit icon for a user
   - Admin clicks "Upload" button in the profile image section
   - Admin selects a new image file
   - A preview of the new image appears
   - Admin clicks "Save Changes" button to submit the form
   - The user's profile is updated with the new photo

3. **Default Avatar Behavior**
   - If a user doesn't have a custom photo, a default avatar is generated based on their initials and role color
   - The default avatar is displayed in the user list and profile views

## Error Handling

- Invalid file types: An error message is displayed if the selected file is not an image
- File size limit: An error message is displayed if the selected file is larger than 4MB
- Upload failures: Error messages are displayed if the upload fails for any reason

## Security Considerations

- Only authenticated users can upload photos
- Only admins can update other users' photos
- File types are validated on both frontend and backend
- File size is limited to prevent abuse