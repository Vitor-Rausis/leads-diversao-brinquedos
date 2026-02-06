const express = require('express');
const router = express.Router();
const multer = require('multer');
const leadController = require('../controllers/leadController');
const authMiddleware = require('../middlewares/auth');
const { validate, leadSchema, leadUpdateSchema } = require('../middlewares/validate');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(csv|xlsx|xls)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('Formato de arquivo nao suportado'));
    }
  },
});

router.use(authMiddleware);

router.get('/', leadController.list);
router.get('/:id', leadController.getById);
router.post('/', validate(leadSchema), leadController.create);
router.put('/:id', validate(leadUpdateSchema), leadController.update);
router.delete('/:id', leadController.remove);
router.post('/import', upload.single('file'), leadController.importFile);

module.exports = router;
