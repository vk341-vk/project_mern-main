import Person from '../models/Person.js';
import Attendance from '../models/Attendance.js';
import Config from '../models/Config.js';
import { getDbStatus, readFallbackStore, writeFallbackStore } from '../config/db.js';

export const dataService = {
  // ================= PEOPLE =================
  async getPeople(query = {}) {
    const status = getDbStatus();
    if (status.connected) {
      const filter = {};
      if (query.type) filter.type = query.type;
      if (query.search) {
        filter.$or = [
          { name: { $regex: query.search, $options: 'i' } },
          { id: { $regex: query.search, $options: 'i' } }
        ];
      }
      return await Person.find(filter).sort({ createdAt: -1 }).lean();
    } else {
      const store = readFallbackStore();
      let list = [...store.people];
      if (query.type) {
        list = list.filter((p) => p.type === query.type);
      }
      if (query.search) {
        const s = query.search.toLowerCase();
        list = list.filter(
          (p) => p.name.toLowerCase().includes(s) || p.id.toLowerCase().includes(s)
        );
      }
      return list;
    }
  },

  async getPersonById(id) {
    const status = getDbStatus();
    const cleanId = String(id).trim().toUpperCase();
    if (status.connected) {
      return await Person.findOne({ id: cleanId }).lean();
    } else {
      const store = readFallbackStore();
      return store.people.find((p) => p.id === cleanId) || null;
    }
  },

  async createPerson(data) {
    const status = getDbStatus();
    const cleanId = String(data.id).trim().toUpperCase();

    // Check duplicate
    const existing = await this.getPersonById(cleanId);
    if (existing) {
      throw new Error(`Person with ID '${cleanId}' already exists.`);
    }

    const newPerson = {
      id: cleanId,
      name: String(data.name).trim(),
      type: data.type === 'staff' ? 'staff' : 'student',
      dept: String(data.dept || '').trim(),
      year: String(data.year || '').trim(),
      email: String(data.email || '').trim().toLowerCase(),
      faceDescriptor: data.faceDescriptor || null,
      rfid: data.rfid || null,
      fingerId: data.fingerId || null,
      qrToken: data.qrToken || `CLPT-${cleanId}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      createdAt: new Date().toISOString()
    };

    if (status.connected) {
      const created = await Person.create(newPerson);
      return created.toObject();
    } else {
      const store = readFallbackStore();
      store.people.unshift(newPerson);
      writeFallbackStore(store);
      return newPerson;
    }
  },

  async updatePerson(id, updateData) {
    const status = getDbStatus();
    const cleanId = String(id).trim().toUpperCase();

    if (status.connected) {
      const updated = await Person.findOneAndUpdate(
        { id: cleanId },
        { $set: updateData },
        { new: true, runValidators: true }
      ).lean();
      if (!updated) throw new Error('Person not found.');
      return updated;
    } else {
      const store = readFallbackStore();
      const idx = store.people.findIndex((p) => p.id === cleanId);
      if (idx === -1) throw new Error('Person not found.');
      store.people[idx] = { ...store.people[idx], ...updateData, updatedAt: new Date().toISOString() };
      writeFallbackStore(store);
      return store.people[idx];
    }
  },

  async deletePerson(id) {
    const status = getDbStatus();
    const cleanId = String(id).trim().toUpperCase();

    if (status.connected) {
      const deleted = await Person.findOneAndDelete({ id: cleanId });
      // Also delete attendance history for this person
      await Attendance.deleteMany({ personId: cleanId });
      return !!deleted;
    } else {
      const store = readFallbackStore();
      const initialLen = store.people.length;
      store.people = store.people.filter((p) => p.id !== cleanId);
      store.attendance = store.attendance.filter((a) => a.personId !== cleanId);
      writeFallbackStore(store);
      return store.people.length < initialLen;
    }
  },

  // ================= ATTENDANCE =================
  async getAttendance(filters = {}) {
    const status = getDbStatus();
    if (status.connected) {
      const query = {};
      if (filters.personId) query.personId = String(filters.personId).trim().toUpperCase();
      if (filters.date) query.date = filters.date;
      if (filters.personType) query.personType = filters.personType;
      if (filters.search) {
        query.$or = [
          { personName: { $regex: filters.search, $options: 'i' } },
          { personId: { $regex: filters.search, $options: 'i' } }
        ];
      }
      return await Attendance.find(query).sort({ date: -1, time: -1 }).lean();
    } else {
      const store = readFallbackStore();
      let records = [...store.attendance].reverse();
      if (filters.personId) {
        records = records.filter((r) => r.personId === String(filters.personId).trim().toUpperCase());
      }
      if (filters.date) {
        records = records.filter((r) => r.date === filters.date);
      }
      if (filters.personType) {
        records = records.filter((r) => r.personType === filters.personType);
      }
      if (filters.search) {
        const s = filters.search.toLowerCase();
        records = records.filter(
          (r) => r.personName.toLowerCase().includes(s) || r.personId.toLowerCase().includes(s)
        );
      }
      return records;
    }
  },

  async recordAttendance(data) {
    const status = getDbStatus();
    const cleanId = String(data.personId).trim().toUpperCase();
    const person = await this.getPersonById(cleanId);
    if (!person) {
      throw new Error(`Person with ID '${cleanId}' is not enrolled in the system.`);
    }

    const now = new Date();
    const dateStr = data.date || now.toISOString().slice(0, 10);
    const timeStr = data.time || now.toTimeString().slice(0, 8);

    // Check duplicate check-in today
    const existing = await this.getAttendance({ personId: cleanId, date: dateStr });
    if (existing && existing.length > 0) {
      throw new Error(`Attendance already recorded for ${person.name} (${cleanId}) on ${dateStr}.`);
    }

    const recordData = {
      personId: cleanId,
      personName: person.name,
      personType: person.type,
      dept: person.dept,
      date: dateStr,
      time: timeStr,
      methods: data.methods || ['Manual / Direct'],
      status: data.status || 'present',
      verificationScore: data.verificationScore || 0.95
    };

    if (status.connected) {
      const created = await Attendance.create(recordData);
      return created.toObject();
    } else {
      const store = readFallbackStore();
      const record = {
        _id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        ...recordData,
        createdAt: now.toISOString()
      };
      store.attendance.push(record);
      writeFallbackStore(store);
      return record;
    }
  },

  async deleteAttendanceRecord(id) {
    const status = getDbStatus();
    if (status.connected) {
      const res = await Attendance.findByIdAndDelete(id);
      return !!res;
    } else {
      const store = readFallbackStore();
      const initialLen = store.attendance.length;
      store.attendance = store.attendance.filter(
        (a) => a._id !== id && a.id !== id && `${a.personId}_${a.date}` !== id
      );
      writeFallbackStore(store);
      return store.attendance.length < initialLen;
    }
  },

  async clearAllAttendance() {
    const status = getDbStatus();
    if (status.connected) {
      await Attendance.deleteMany({});
      return true;
    } else {
      const store = readFallbackStore();
      store.attendance = [];
      writeFallbackStore(store);
      return true;
    }
  },

  // ================= CONFIG =================
  async getConfig() {
    const status = getDbStatus();
    const defaultConfig = {
      face: true,
      rfid: false,
      finger: false,
      qr: false,
      otp: false,
      minDetectionScore: 0.72,
      faceMatchThreshold: 0.5
    };

    if (status.connected) {
      let cfg = await Config.findOne({ key: 'system_config' }).lean();
      if (!cfg) {
        cfg = await Config.create({ key: 'system_config', ...defaultConfig });
        return cfg.toObject();
      }
      return cfg;
    } else {
      const store = readFallbackStore();
      return { ...defaultConfig, ...(store.config || {}) };
    }
  },

  async updateConfig(newConfig) {
    const status = getDbStatus();
    if (status.connected) {
      const updated = await Config.findOneAndUpdate(
        { key: 'system_config' },
        { $set: newConfig },
        { new: true, upsert: true }
      ).lean();
      return updated;
    } else {
      const store = readFallbackStore();
      store.config = { ...(store.config || {}), ...newConfig };
      writeFallbackStore(store);
      return store.config;
    }
  },

  // ================= STATS & REPORTS =================
  async getDashboardStats() {
    const people = await this.getPeople();
    const today = new Date().toISOString().slice(0, 10);
    const todayRecords = await this.getAttendance({ date: today });

    const students = people.filter((p) => p.type !== 'staff');
    const staff = people.filter((p) => p.type === 'staff');
    const presentIds = new Set(todayRecords.map((r) => r.personId));

    const totalEnrolled = people.length;
    const presentTodayCount = presentIds.size;
    const rate = totalEnrolled ? Math.round((presentTodayCount / totalEnrolled) * 100) : 0;

    const recentRecords = await this.getAttendance();
    const recentActivity = recentRecords.slice(0, 8);

    return {
      studentsCount: students.length,
      staffCount: staff.length,
      totalEnrolled,
      presentTodayCount,
      rate,
      recentActivity
    };
  },

  async getReportsSummary() {
    const people = await this.getPeople();
    const allAttendance = await this.getAttendance();

    // Distinct calendar dates recorded across the entire system
    const uniqueDates = new Set(allAttendance.map((a) => a.date));
    const totalSessions = uniqueDates.size || 0;

    const reportRows = people.map((person) => {
      const personAttendances = allAttendance.filter((a) => a.personId === person.id);
      const daysPresent = personAttendances.length;
      const percentage = totalSessions > 0 ? Math.round((daysPresent / totalSessions) * 100) : 0;

      return {
        id: person.id,
        name: person.name,
        type: person.type,
        dept: person.dept || '—',
        year: person.year || '—',
        daysPresent,
        totalSessions,
        percentage
      };
    });

    return {
      totalSessions,
      uniqueDatesCount: totalSessions,
      reports: reportRows
    };
  }
};
