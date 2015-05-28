var ActionHandler = require("./handlers/ActionHandler"),
    ControllerProvider = require("./providers/ControllerProvider");

function Controller(model, request) {

    //If first argument is controller object, then copy its fields.
    var baseControllerObj = {};
    if(model instanceof Controller)
        baseControllerObj = model;

    this._controllerProvider = new ControllerProvider(this);
    this._model = baseControllerObj._model || model;
    this._request = baseControllerObj._request || request;
    this._data_type = baseControllerObj._data_type || "";
    this._data_loading_type = baseControllerObj._data_loading_type || "static";
    this._server_fields = baseControllerObj._server_fields || {};
    this._client_fields = baseControllerObj._client_fields || {};
    this._fields_anchors = baseControllerObj._fields_anchors || {};
    this._use_only_mapped_fields = baseControllerObj._use_only_mapped_fields || false;

    this._controllerProvider.setFieldsAnchors({id: "id", order: "order"});

    var actionHandlerObj = new ActionHandler(this._controllerProvider);
    this.crud = actionHandlerObj.createActionHandler("crud");
    this.data = actionHandlerObj.createActionHandler("data");
}

/**
 * Set keys of data.
 * @param {Object} fields - hash of data to mapping. Example: {"title": "my_db_title"}
 * @param {boolean} useOnlyMappedFields
 * @returns {Controller}
 */
Controller.prototype.map = function(fields, useOnlyMappedFields) {
    var newObj = new Controller(this);
    newObj._server_fields = fields;
    newObj._use_only_mapped_fields = !!useOnlyMappedFields;

    for(var key in fields)
        newObj._client_fields[fields[key]] = key;

    return newObj;
};

/**
 * Set object or connect string db.
 * @param {Object} db
 */
Controller.prototype.db = function(db) {this._model.setDb(db);};

Controller.prototype.tree = function(db) {
    var controllerProvider = this._controllerProvider,
        fieldsAnchors = {};

    fieldsAnchors[controllerProvider.ANCHOR_FIELD_PARENT_ID] = "parent";
    controllerProvider.setFieldsAnchors(fieldsAnchors);

    controllerProvider.setDataType(controllerProvider.DATA_TYPE_TREE);
    this.db(db);
};

Controller.prototype.treeDynamic = function(db) {
    var controllerProvider = this._controllerProvider,
        fieldsAnchors = {};

    fieldsAnchors[controllerProvider.ANCHOR_FIELD_PARENT_ID] = "parent";
    fieldsAnchors[controllerProvider.ANCHOR_FIELD_TREE_SELECTION] = "parent";
    fieldsAnchors[controllerProvider.ANCHOR_FIELD_NODE_HAS_CHILDREN] = "webix_kids";
    controllerProvider.setFieldsAnchors(fieldsAnchors);

    controllerProvider.setDataType(controllerProvider.DATA_TYPE_TREE);
    controllerProvider.setDataLoadingType(controllerProvider.LOADING_TYPE_DYNAMIC);
    this.db(db);
};

module.exports = function(model, request) {
    return new Controller(model, request);
};