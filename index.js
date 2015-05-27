var ActionHandler = require("./handlers/ActionHandler"),
    ControllerProvider = require("./providers/ControllerProvider");

function Controller(model, request) {
    this._controllerProvider = new ControllerProvider(this);
    this._model = model;
    this._request = request;
    this._data_type = "";
    this._server_fields = {};
    this._client_fields = {};
    this._fields_anchors = {};
    this._use_only_mapped_fields = false;

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
    var newObj = new Controller(this._model, this._request);
    newObj._server_fields = fields;
    newObj._fields_anchors = this._fields_anchors;
    newObj._use_only_mapped_fields = !!useOnlyMappedFields;
    newObj._data_type = this._data_type;

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
    this._controllerProvider.setFieldsAnchors({parent_id: "parent"});
    this._controllerProvider.setDataType("tree");
    this.db(db);
};

Controller.prototype.treeDynamic = function(db) {
    this._controllerProvider.setFieldsAnchors({parent_id: "parent"});
    this._controllerProvider.setDataType("tree");
    this.db(db);
};

module.exports = function(model, request) {
    return new Controller(model, request);
};