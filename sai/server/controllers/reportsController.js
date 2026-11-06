import { dataService } from '../services/dataService.js';

export const getReports = async (req, res) => {
  try {
    const summary = await dataService.getReportsSummary();
    res.json({ success: true, data: summary });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
