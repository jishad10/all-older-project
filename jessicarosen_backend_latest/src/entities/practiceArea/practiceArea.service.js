import subPracticeAreaModel from "../subPracticeArea/subPracticeArea.model.js";
import PracticeArea from "./practiceArea.model.js";


export const createPracticeAreaService = async ({ name, description, createdBy, subPracticeAreas }) => {
  const existing = await PracticeArea.findOne({ name: name.trim() });
  if (existing) throw new Error('Practice Area already exists.');

  const practiceArea = new PracticeArea({ name, description, createdBy });
  await practiceArea.save();

  if (Array.isArray(subPracticeAreas)) {
    await Promise.all(
      subPracticeAreas.map((subAreaName) =>
        new subPracticeAreaModel({ name: subAreaName.trim(), category: practiceArea._id }).save()
      )
    );
  }

  return practiceArea;
};


export const getAllPracticeAreasService =async () => {
  const practiceAreas = await PracticeArea.find({}).limit(15).lean();

  const result = await Promise.all(
    practiceAreas.map(async (area) => {
      const subPracticeAreas = await subPracticeAreaModel.find({ category: area._id }).lean();
      return { ...area, subPracticeAreas };
    })
  );

  return result;
};

export const getPracticeAreaByIdService = async (practiceAreaId) => {
  const practiceAreas = await PracticeArea.findById(practiceAreaId).lean();
  const subPracticeAreas = await subPracticeAreaModel.find({ category: practiceAreaId }).lean();
  return { ...practiceAreas, subPracticeAreas };
};

export const updatePracticeAreaService = async (practiceAreaId, { name, description, subPracticeAreas }) => {
  const practiceArea = await PracticeArea.findByIdAndUpdate(practiceAreaId, { name, description }, { new: true });
  if (!practiceArea) throw new Error('Practice Area not found');

  if (Array.isArray(subPracticeAreas)) {
    const existingSubPracticeAreas = await subPracticeAreaModel.find({ category: practiceAreaId });
    const existingNames = existingSubPracticeAreas.map(({ name }) => name);
    const newSubPracticeAreas = subPracticeAreas.filter((name) => !existingNames.includes(name));
    const deletedSubPracticeAreas = existingSubPracticeAreas.filter(({ name }) => !subPracticeAreas.includes(name));

    await Promise.all([
      ...newSubPracticeAreas.map((name) => new subPracticeAreaModel({ name: name.trim(), category: practiceArea._id }).save()),
      ...deletedSubPracticeAreas.map(({ _id }) => subPracticeAreaModel.findByIdAndDelete(_id)),
    ]);
  }

  return practiceArea;
};

export const deletePracticeAreaService = async (practiceAreaId) => {
  const deleted = await PracticeArea.findByIdAndDelete(practiceAreaId);
  if (!deleted) throw new Error('Practice Area not found or already deleted');

  await subPracticeAreaModel.deleteMany({ category: practiceAreaId });

  return deleted;
};

