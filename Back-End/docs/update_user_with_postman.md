# Updating a User with Postman

This document explains how to update a specific user using Postman.

## Prerequisites

- You must have an admin account
- You must be logged in and have a valid JWT token

## API Endpoint

```
PUT http://localhost:9777/user/update/:id
```

Replace `:id` with the actual user ID you want to update.

## Headers

| Header          | Value                      | Description                    |
|-----------------|----------------------------|--------------------------------|
| Content-Type    | application/json           | Specifies the request format   |
| Authorization   | Bearer YOUR_JWT_TOKEN      | Your JWT authentication token  |

## Request Body

You can update any of the following fields:

```json
{
  "name": "Updated Name",
  "lastname": "Updated Last Name",
  "email": "updated.email@example.com",
  "role": "student",
  "password": "newpassword"
}
```

All fields are optional. Only include the fields you want to update.

## Example Request

1. Open Postman
2. Create a new PUT request to `http://localhost:9777/user/update/64f7a1b2c3d4e5f6a7b8c9d0` (replace with actual user ID)
3. Set the headers:
   - Content-Type: application/json
   - Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (your actual token)
4. Set the request body (raw, JSON):
   ```json
   {
     "name": "John",
     "lastname": "Doe",
     "email": "john.doe@example.com",
     "role": "manager"
   }
   ```
5. Click Send

## Response

If successful, you will receive a response like:

```json
{
  "success": true,
  "data": {
    "_id": "64f7a1b2c3d4e5f6a7b8c9d0",
    "name": "John",
    "lastname": "Doe",
    "email": "john.doe@example.com",
    "role": "manager",
    "createdAt": "2023-09-05T12:34:56.789Z",
    "updatedAt": "2023-09-06T12:34:56.789Z"
  },
  "message": "User updated successfully"
}
```

## Notes

- Only users with the admin role can update other users
- If you include a password field, it will be hashed before saving
- The response will not include the password field
- If you try to update a user that doesn't exist, you will receive a 404 error
- If you try to update a user without admin privileges, you will receive a 403 error