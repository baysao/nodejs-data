var Promise = require("bluebird"),
    ActionHandler = require("./handlers/ActionHandler");

const FIELD_ID = "id";
const FIELD_ORDER = "order";
const FIELD_PARENT_ID = "parent_id";

function Controller(model, request) {
    this.model = model;
    this.request = request;
    this._data_type = "";
    this._server_fields = {};
    this._client_fields = {};
    this._fields_settings = {id: "id", order: null};
    this._fields_anchors = {id: "id", order: "order"};
    this._use_only_mapped_fields = false;

    var actionHandlerObj = new ActionHandler(this);
    this.crud = actionHandlerObj.createActionHandler("crud");
    this.data = actionHandlerObj.createActionHandler("data");
}

Controller.prototype.setFieldsAnchors = function(fieldsAnchors) {
    for(var field in fieldsAnchors) {
        var anchor = fieldsAnchors[field];
        this._fields_anchors[field] = anchor;
    }

    return this;
};

/**
 * Set keys of data.
 * @param {Object} fields - hash of data to mapping. Example: {"title": "my_db_title"}
 * @param {boolean} useOnlyMappedFields
 * @returns {Controller}
 */
Controller.prototype.map = function(fields, useOnlyMappedFields) {
    var newObj = new Controller(this.model, this.request);
    newObj._server_fields = fields;
    newObj._fields_settings.id = fields.id || newObj._fields_settings.id;
    newObj._fields_settings.order = fields.order || newObj._fields_settings.order;
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
Controller.prototype.db = function(db) {this.model.setDb(db);};

Controller.prototype.tree = function(db) {
    this.setFieldsAnchors({parent_id: "parent"});
    this._data_type = "tree";
    this.db(db);
};

module.exports = function(model, request) {
    return new Controller(model, request);
};