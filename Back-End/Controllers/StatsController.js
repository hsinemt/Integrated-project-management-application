const CodeFile = require('../Models/CodeFile');
const ZipFile = require('../Models/ZipFile');
const User = require('../Models/User');


exports.getCodeFilesCount = async (req, res) => {
  try {
    const count = await CodeFile.countDocuments();
    res.status(200).json({ success: true, count });
  } catch (error) {
    console.error('Error getting code files count:', error);
    res.status(500).json({ success: false, message: 'Error getting code files count', error: error.message });
  }
};

exports.getZipFilesCount = async (req, res) => {
  try {
    const count = await ZipFile.countDocuments();
    res.status(200).json({ success: true, count });
  } catch (error) {
    console.error('Error getting zip files count:', error);
    res.status(500).json({ success: false, message: 'Error getting zip files count', error: error.message });
  }
};


exports.getManagersCount = async (req, res) => {
  try {
    const count = await User.countDocuments({ role: 'manager' });
    res.status(200).json({ success: true, count });
  } catch (error) {
    console.error('Error getting managers count:', error);
    res.status(500).json({ success: false, message: 'Error getting managers count', error: error.message });
  }
};


exports.getTutorsCount = async (req, res) => {
  try {
    const count = await User.countDocuments({ role: 'tutor' });
    res.status(200).json({ success: true, count });
  } catch (error) {
    console.error('Error getting tutors count:', error);
    res.status(500).json({ success: false, message: 'Error getting tutors count', error: error.message });
  }
};


exports.getDashboardStats = async (req, res) => {
  try {
    const [codeFilesCount, zipFilesCount, managersCount, tutorsCount] = await Promise.all([
      CodeFile.countDocuments(),
      ZipFile.countDocuments(),
      User.countDocuments({ role: 'manager' }),
      User.countDocuments({ role: 'tutor' })
    ]);

    res.status(200).json({
      success: true,
      stats: {
        codeFilesCount,
        zipFilesCount,
        managersCount,
        tutorsCount
      }
    });
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    res.status(500).json({ success: false, message: 'Error getting dashboard stats', error: error.message });
  }
};