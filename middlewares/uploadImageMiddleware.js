const { createUpload } = require('../config/cloudinary');

const uploadSingleImage = (fieldName, folder) => {
  const upload = createUpload(folder);
  return upload.single(fieldName);
};

const uploadMixOfImages = (arrayOfFields, folder) => {
  const upload = createUpload(folder);
  return upload.fields(arrayOfFields);
};

module.exports = {
  uploadSingleImage,
  uploadMixOfImages
};