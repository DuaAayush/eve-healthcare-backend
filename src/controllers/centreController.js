const { DiagnosticCentre, DiagnosticTest } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// Any authenticated user can register a centre. A real system would gate
// this behind an admin/staff role, but that's out of scope for this
// assignment -- noted as a stated assumption in the README.
const createCentre = asyncHandler(async (req, res) => {
  const { name, location } = req.body;
  const centre = await DiagnosticCentre.create({ name, location });
  res.status(201).json(centre);
});

const listCentres = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);

  const { rows: centres, count: total } = await DiagnosticCentre.findAndCountAll({
    offset: (page - 1) * limit,
    limit,
    order: [['createdAt', 'DESC']],
    include: [{ model: DiagnosticTest }],
  });

  res.status(200).json({
    data: centres,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

const getCentre = asyncHandler(async (req, res) => {
  const centre = await DiagnosticCentre.findByPk(req.params.id, {
    include: [{ model: DiagnosticTest }],
  });
  if (!centre) throw new ApiError(404, 'Diagnostic centre not found');
  res.status(200).json(centre);
});

// --- Tests, nested under a centre ---

const addTestToCentre = asyncHandler(async (req, res) => {
  const centre = await DiagnosticCentre.findByPk(req.params.id);
  if (!centre) throw new ApiError(404, 'Diagnostic centre not found');

  const { name, price } = req.body;
  const test = await DiagnosticTest.create({ name, price, centreId: centre.id });
  res.status(201).json(test);
});

const listTestsForCentre = asyncHandler(async (req, res) => {
  const centre = await DiagnosticCentre.findByPk(req.params.id);
  if (!centre) throw new ApiError(404, 'Diagnostic centre not found');

  const tests = await DiagnosticTest.findAll({ where: { centreId: centre.id } });
  res.status(200).json(tests);
});

module.exports = {
  createCentre,
  listCentres,
  getCentre,
  addTestToCentre,
  listTestsForCentre,
};
