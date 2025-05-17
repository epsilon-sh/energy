export default function multer(options) {
  return {
    single: (fieldName) => (req, res, next) => {
      req.file = {
        path: '/tmp/mock-upload-path',
        mimetype: 'text/csv'
      };
      next();
    }
  };
}
