const expressAsyncHandler = require("express-async-handler");
const endpointError = require("../utils/endpointError");
const ApiFeatures = require("../utils/apiFeatures");
const ActivityLogger = require("../socket/activityLogger");

// Activity configuration for different models
const ACTIVITY_CONFIG = {
  Category: {
    modelType: 'category',
    nameField: 'name',
    methods: {
      create: 'logCategoryActivity',
      update: 'logCategoryActivity',
      delete: 'logCategoryActivity'
    }
  },
  Product: {
    modelType: 'product',
    nameField: 'title',
    methods: {
      create: 'logProductActivity',
      update: 'logProductActivity',
      delete: 'logProductActivity'
    }
  },
  User: {
    modelType: 'user',
    nameField: 'name',
    methods: {
      create: 'logUserActivity',
      update: 'logUserActivity',
      delete: 'logUserActivity'
    }
  },
  Order: {
    modelType: 'order',
    nameField: '_id',
    methods: {
      create: 'logOrderActivity',
      update: 'logOrderActivity',
      delete: 'logOrderActivity'
    }
  }
};

// Helper function to get activity config
const getActivityConfig = (Model) => {
  return ACTIVITY_CONFIG[Model.modelName] || null;
};

// Helper function to detect changes between original and updated documents
const detectChanges = (original, updated, config) => {
  const changes = [];
  const nameField = config.nameField;
  
  // Check name/title field changes
  if (original[nameField] !== updated[nameField]) {
    changes.push(
      `${nameField} changed from "${original[nameField]}" to "${updated[nameField]}"`
    );
  }
  
  // Check image changes (common field)
  if (original.image !== updated.image && updated.image) {
    changes.push("image updated");
  }
  
  // Check price changes (for products)
  if (original.price !== undefined && original.price !== updated.price) {
    changes.push(
      `price changed from $${original.price} to $${updated.price}`
    );
  }
  
  // Check quantity changes (for products)
  if (original.quantity !== undefined && original.quantity !== updated.quantity) {
    changes.push(
      `quantity changed from ${original.quantity} to ${updated.quantity}`
    );
  }
  
  // Check status changes (for orders)
  if (original.status !== undefined && original.status !== updated.status) {
    changes.push(
      `status changed from "${original.status}" to "${updated.status}"`
    );
  }
  
  return changes;
};

exports.createOne = (Model) =>
  expressAsyncHandler(async (req, res) => {
    const newDocument = await Model.create(req.body);
    
    // Log activity if config exists and user is available
    const config = getActivityConfig(Model);
    if (config && req.user) {
      const logMethod = ActivityLogger[config.methods.create];
      if (logMethod) {
        await logMethod('create', newDocument, req.user);
      }
    }
    
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
    let query = apiFeatures.filter().search(searchFields).sort().limitFields();

    // 3. Count the total number of documents that match the filter/search criteria
    const documentsCounts = await query.mongooseQuery.clone().countDocuments();

    // 4. Apply pagination to the query
    query = query.paginate(documentsCounts);

    // 5. Apply population if specified
    if (populationOpt) {
      query.mongooseQuery = query.mongooseQuery.populate(populationOpt);
    }

    // 6. Execute the final query
    const documents = await query.mongooseQuery;
    
    // 7. Check if no documents were found
    if (documents.length === 0) {
      return next(
        new endpointError(`there are no ${Model.modelName} to get`, 404)
      );
    }

    // 8. Send the response with results, pagination, and documents
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
        new endpointError(`there is no ${Model.modelName} with this ID format`, 404)
      );
    }
    res.status(200).json(document);
  });

exports.updateOne = (Model) =>
  expressAsyncHandler(async (req, res, next) => {
    const documentId = req.params.id;
    
    // Get activity config
    const config = getActivityConfig(Model);
    let originalDocument = null;
    
    // Get original document if activity logging is enabled
    if (config && req.user) {
      originalDocument = await Model.findById(documentId);
      if (!originalDocument) {
        return next(
          new endpointError(`there is no ${Model.modelName} with this ID format`, 404)
        );
      }
    }
    
    // Update the document
    const updatedDocument = await Model.findByIdAndUpdate(
      documentId,
      req.body,
      { new: true }
    );
    
    if (!updatedDocument) {
      return next(
        new endpointError(`there is no ${Model.modelName} with this ID format`, 404)
      );
    }
    
    // Log activity if config exists and user is available
    if (config && req.user && originalDocument) {
      const logMethod = ActivityLogger[config.methods.update];
      if (logMethod) {
        // Detect changes
        const changes = detectChanges(originalDocument, updatedDocument, config);
        const additionalData = {
          changes: changes.length > 0 ? changes.join(", ") : "general update",
          originalData: {
            [config.nameField]: originalDocument[config.nameField],
            ...(originalDocument.image && { image: originalDocument.image }),
            ...(originalDocument.price && { price: originalDocument.price }),
            ...(originalDocument.quantity && { quantity: originalDocument.quantity }),
            ...(originalDocument.status && { status: originalDocument.status })
          }
        };
        
        await logMethod('update', updatedDocument, req.user, additionalData);
      }
    }
    
    res.status(200).json({ data: updatedDocument });
  });

exports.deleteOne = (Model) =>
  expressAsyncHandler(async (req, res, next) => {
    const documentId = req.params.id;
    
    // Get activity config
    const config = getActivityConfig(Model);
    let documentToDelete = null;
    
    // Get document before deletion if activity logging is enabled
    if (config && req.user) {
      documentToDelete = await Model.findById(documentId);
      if (!documentToDelete) {
        return next(
          new endpointError(`there is no ${Model.modelName} with this ID format`, 404)
        );
      }
    }
    
    // Delete the document
    const deletedDocument = await Model.findByIdAndDelete(documentId);
    
    if (!deletedDocument) {
      return next(
        new endpointError(`there is no ${Model.modelName} with this ID format`, 404)
      );
    }
    
    // Log activity if config exists and user is available
    if (config && req.user && documentToDelete) {
      const logMethod = ActivityLogger[config.methods.delete];
      if (logMethod) {
        await logMethod('delete', documentToDelete, req.user);
      }
    }
    
    res.status(204).send();
  });

exports.deleteMany = (Model) =>
  expressAsyncHandler(async (req, res, next) => {
    const { ids } = req.body; // Expect an array of IDs

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return next(new endpointError("IDs array is required", 400));
    }

    // Get activity config
    const config = getActivityConfig(Model);
    let documentsToDelete = [];
    
    // Get documents before deletion if activity logging is enabled
    if (config && req.user) {
      documentsToDelete = await Model.find({ _id: { $in: ids } });
    }

    // Delete documents
    const deletedDocuments = await Model.deleteMany({
      _id: { $in: ids },
    });

    if (!deletedDocuments || deletedDocuments.deletedCount === 0) {
      return next(new endpointError(`No ${Model.modelName} were deleted`, 404));
    }

    // Log activity for each deleted document if config exists and user is available
    if (config && req.user && documentsToDelete.length > 0) {
      const logMethod = ActivityLogger[config.methods.delete];
      if (logMethod) {
        for (const document of documentsToDelete) {
          await logMethod('delete', document, req.user, {
            bulkOperation: true,
            totalDeleted: deletedDocuments.deletedCount,
          });
        }
      }
    }

    res.status(200).json({
      message: `${deletedDocuments.deletedCount} ${Model.modelName}(s) deleted successfully`,
      deletedCount: deletedDocuments.deletedCount,
    });
  });

// Enhanced methods with explicit activity logging (for special cases)
exports.createOneWithActivity = (Model, activityType) =>
  expressAsyncHandler(async (req, res) => {
    const newDocument = await Model.create(req.body);
    
    // Explicit activity logging
    if (req.user && activityType) {
      const config = getActivityConfig(Model);
      if (config) {
        const logMethod = ActivityLogger[config.methods.create];
        if (logMethod) {
          await logMethod('create', newDocument, req.user);
        }
      }
    }
    
    res.status(201).json(newDocument);
  });

exports.updateOneWithActivity = (Model, activityType) =>
  expressAsyncHandler(async (req, res, next) => {
    const documentId = req.params.id;
    
    // Get original document for comparison
    const originalDocument = await Model.findById(documentId);
    if (!originalDocument) {
      return next(
        new endpointError(`there is no ${Model.modelName} with this ID format`, 404)
      );
    }
    
    // Update the document
    const updatedDocument = await Model.findByIdAndUpdate(
      documentId,
      req.body,
      { new: true }
    );
    
    if (!updatedDocument) {
      return next(
        new endpointError(`there is no ${Model.modelName} with this ID format`, 404)
      );
    }
    
    // Explicit activity logging
    if (req.user && activityType) {
      const config = getActivityConfig(Model);
      if (config) {
        const logMethod = ActivityLogger[config.methods.update];
        if (logMethod) {
          const changes = detectChanges(originalDocument, updatedDocument, config);
          const additionalData = {
            changes: changes.length > 0 ? changes.join(", ") : "general update",
            originalData: {
              [config.nameField]: originalDocument[config.nameField],
              ...(originalDocument.image && { image: originalDocument.image }),
            }
          };
          
          await logMethod('update', updatedDocument, req.user, additionalData);
        }
      }
    }
    
    res.status(200).json({ data: updatedDocument });
  });

exports.deleteOneWithActivity = (Model, activityType) =>
  expressAsyncHandler(async (req, res, next) => {
    const documentId = req.params.id;
    
    // Get document before deletion
    const documentToDelete = await Model.findById(documentId);
    if (!documentToDelete) {
      return next(
        new endpointError(`there is no ${Model.modelName} with this ID format`, 404)
      );
    }
    
    // Delete the document
    const deletedDocument = await Model.findByIdAndDelete(documentId);
    
    if (!deletedDocument) {
      return next(
        new endpointError(`there is no ${Model.modelName} with this ID format`, 404)
      );
    }
    
    // Explicit activity logging
    if (req.user && activityType) {
      const config = getActivityConfig(Model);
      if (config) {
        const logMethod = ActivityLogger[config.methods.delete];
        if (logMethod) {
          await logMethod('delete', documentToDelete, req.user);
        }
      }
    }
    
    res.status(204).send();
  });