const expressAsyncHandler = require("express-async-handler");
const endpointError = require("../utils/endpointError");
const ApiFeatures = require("../utils/apiFeatures");

exports.createOne = (Model) =>
  expressAsyncHandler(async (req, res) => {
    const newDocument = await Model.create(req.body);
    res.status(201).json(newDocument);
  });

exports.getAll = (Model, searchFields = [], populationOpt) =>
  expressAsyncHandler(async (req, res, next) => {
    let filter;
    if (req.filterObj) {
      filter = req.filterObj;
    }
    // 1. Create an instance of ApiFeatures with an initial query object
    const apiFeatures = new ApiFeatures(Model.find(filter), req.query);

    // 2. Build the query chain for filtering, searching, and sorting
    // NOTE: We don't apply pagination yet.
    let query = apiFeatures.filter().search(searchFields).sort().limitFields();

    // 3. Count the total number of documents that match the filter/search criteria
    // We use .clone() to avoid executing the query twice on the same Mongoose instance
    const documentsCounts = await query.mongooseQuery.clone().countDocuments();

    // 4. Apply pagination to the query and get the final documents
    // 4. Apply pagination to the query
    query = query.paginate(documentsCounts);

    // 5. Apply population if specified
    if (populationOpt) {
      query.mongooseQuery = query.mongooseQuery.populate(populationOpt);
    }

    // 6. Execute the final query
    const documents = await query.mongooseQuery;
    // 5. Check if no documents were found
    if (documents.length === 0) {
      return next(
        new endpointError(`there are no ${Model.modelName} to get`, 404)
      );
    }

    // 6. Send the response with results, pagination, and documents
    res.status(200).json({
      result: documents.length,
      pagination: apiFeatures.pagination,
      documents,
    });
  });

exports.getOne = (Model, populationOpt) =>
  expressAsyncHandler(async (req, res, next) => {
    const _id = req.params.id;
    // 1) Build query
    let query = Model.findById(_id);
    if (populationOpt) {
      query = query.populate(populationOpt);
    }

    // 2) Execute query
    const document = await query;

    if (!document) {
      return next(
        new endpointError(`there is no ${Model} with this ID format`, 404)
      );
    }
    res.status(200).json(document);
  });

exports.updateOne = (Model) =>
  expressAsyncHandler(async (req, res, next) => {
    const updatedDocument = await Model.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!updatedDocument) {
      return next(
        new endpointError(
          `there is no ${Model.modelName} with this ID format`,
          404
        )
      );
    }
    res.status(200).json({ data: updatedDocument });
  });

exports.deleteOne = (Model) =>
  expressAsyncHandler(async (req, res, next) => {
    const deletedDocument = await Model.findByIdAndDelete(req.params.id);
    if (!deletedDocument) {
      return next(
        new endpointError(`there is no ${Model} with this ID format`, 404)
      );
    }
    // deletedDocument.remove();
    res.status(204).send();
  });

exports.deleteMany = (Model) =>
  expressAsyncHandler(async (req, res, next) => {
    const { ids } = req.body; // Expect an array of IDs

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return next(new endpointError("IDs array is required", 400));
    }

    const deletedDocuments = await Model.deleteMany({
      _id: { $in: ids },
    });

    if (!deletedDocuments || deletedDocuments.deletedCount === 0) {
      return next(new endpointError(`No ${Model.modelName} were deleted`, 404));
    }

    res.status(200).json({
      message: `${deletedDocuments.deletedCount} ${Model.modelName}(s) deleted successfully`,
      deletedCount: deletedDocuments.deletedCount,
    });
  });
