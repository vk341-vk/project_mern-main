import express from 'express';
import {
  getPeople,
  getPersonById,
  createPerson,
  updatePerson,
  deletePerson,
  enrolCredential
} from '../controllers/peopleController.js';

const router = express.Router();

router.get('/', getPeople);
router.post('/', createPerson);
router.get('/:id', getPersonById);
router.put('/:id', updatePerson);
router.delete('/:id', deletePerson);
router.post('/:id/enrol', enrolCredential);

export default router;
