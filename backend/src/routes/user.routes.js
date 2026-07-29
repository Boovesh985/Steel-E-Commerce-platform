/**
 * User routes — profile + addresses.
 */
const { Router } = require('express');
const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { updateProfileSchema, addressSchema, setPasswordSchema } = require('../schemas/auth.schema');
const ctrl = require('../controllers/user.controller');

const router = Router();

router.use(requireAuth);

router.get('/me', ctrl.getProfile);
router.put('/me', validate(updateProfileSchema), ctrl.updateProfile);
router.put('/me/password', validate(setPasswordSchema), ctrl.setPassword);

router.get('/me/addresses', ctrl.listAddresses);
router.post('/me/addresses', validate(addressSchema), ctrl.createAddress);
router.put('/me/addresses/:id', validate(addressSchema.partial()), ctrl.updateAddress);
router.delete('/me/addresses/:id', ctrl.deleteAddress);

module.exports = router;
