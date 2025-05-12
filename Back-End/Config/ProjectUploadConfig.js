const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = './uploads/projects';


const createUploadDirectories = () => {
    try {
        if (!fs.existsSync('./uploads')) {
            fs.mkdirSync('./uploads');
        }

        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });

        }
    } catch (error) {
        console.error('Error creating upload directories:', error);
        throw new Error('Failed to create upload directories');
    }
};


createUploadDirectories();


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, 'project-avatar-' + uniqueSuffix + ext);
    }
});


const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};


const upload = multer({
    storage: storage,
    limits: {
        fileSize: 4 * 1024 * 1024,
    },
    fileFilter: fileFilter
});

const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File is too large. Maximum size is 4MB.'
            });
        }
        return res.status(400).json({
            success: false,
            message: `File upload error: ${err.message}`
        });
    } else if (err) {
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }
    next();
};

const uploadProjectAvatar = (req, res, next) => {
    upload.single('projectAvatar')(req, res, (err) => {
        if (err) {
            console.error('Multer error:', err);
            return res.status(400).json({
                success: false,
                message: err.message || 'File upload failed'
            });
        }
        next();
    });
};

module.exports = {
    uploadProjectAvatar,
    handleMulterError,
    upload
};
