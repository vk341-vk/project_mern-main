import { dataService } from '../services/dataService.js';

export const getPeople = async (req, res) => {
  try {
    const { type, search } = req.query;
    const people = await dataService.getPeople({ type, search });
    res.json({ success: true, count: people.length, data: people });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPersonById = async (req, res) => {
  try {
    const person = await dataService.getPersonById(req.params.id);
    if (!person) {
      return res.status(404).json({ success: false, message: 'Person not found' });
    }
    res.json({ success: true, data: person });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createPerson = async (req, res) => {
  try {
    const { id, name, type, dept, year, email } = req.body;
    if (!id || !name) {
      return res.status(400).json({
        success: false,
        message: 'Name and ID (Roll/Employee number) are required.'
      });
    }

    const created = await dataService.createPerson({
      id,
      name,
      type: type === 'staff' ? 'staff' : 'student',
      dept,
      year,
      email
    });

    res.status(201).json({
      success: true,
      message: `${name} (${id}) registered successfully as ${type || 'student'}.`,
      data: created
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updatePerson = async (req, res) => {
  try {
    const updated = await dataService.updatePerson(req.params.id, req.body);
    res.json({ success: true, message: 'Person updated successfully.', data: updated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deletePerson = async (req, res) => {
  try {
    const deleted = await dataService.deletePerson(req.params.id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Person not found' });
    }
    res.json({ success: true, message: `Person ${req.params.id} deleted successfully.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const enrolCredential = async (req, res) => {
  try {
    const { id } = req.params;
    const { kind, value } = req.body;
    // kind: 'face' | 'rfid' | 'finger' | 'qr'

    const person = await dataService.getPersonById(id);
    if (!person) {
      return res.status(404).json({ success: false, message: 'Person not found' });
    }

    const update = {};
    if (kind === 'face') {
      update.faceDescriptor = value; // array or 'SIMULATED'
    } else if (kind === 'rfid') {
      // Check if RFID card already assigned to someone else
      const all = await dataService.getPeople();
      const duplicate = all.find((p) => p.rfid === value && p.id !== person.id);
      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: `RFID UID '${value}' is already assigned to ${duplicate.name} (${duplicate.id}).`
        });
      }
      update.rfid = value;
    } else if (kind === 'finger') {
      const all = await dataService.getPeople();
      const duplicate = all.find((p) => p.fingerId === value && p.id !== person.id);
      if (duplicate) {
        return res.status(400).json({
          success: false,
          message: `Fingerprint ID '${value}' is already assigned to ${duplicate.name} (${duplicate.id}).`
        });
      }
      update.fingerId = value;
    } else if (kind === 'qr') {
      update.qrToken = value || `CLPT-${person.id}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    } else {
      return res.status(400).json({ success: false, message: `Invalid enrollment credential kind: ${kind}` });
    }

    const updated = await dataService.updatePerson(id, update);
    res.json({
      success: true,
      message: `${kind.toUpperCase()} enrolled successfully for ${person.name}.`,
      data: updated
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
