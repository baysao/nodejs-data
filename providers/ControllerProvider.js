function ControllerProvider(controllerObj) {
    this._controller = controllerObj;
}

ControllerProvider.DATA_TYPE_DEFAULT = "default";
ControllerProvider.DATA_TYPE_TREE = "tree";
ControllerProvider.LOADING_TYPE_STATIC = "static";
ControllerProvider.LOADING_TYPE_DYNAMIC = "dynamic";
ControllerProvider.ANCHOR_FIELD_ID = "id";
ControllerProvider.ANCHOR_FIELD_PARENT_ID = "parent_id";
ControllerProvider.ANCHOR_FIELD_ORDER = "order";
ControllerProvider.ANCHOR_FIELD_NODE_HAS_CHILDREN = "$tree_node_has_childer";
ControllerProvider.ANCHOR_FIELD_TREE_SELECTION = "$tree_selection_field_id";

ControllerProvider.prototype.getModelObj = function() {
    return this._controller._model;
}

ControllerProvider.prototype.getRequestObj = function() {
    return this._controller._request;
}

ControllerProvider.prototype.getDataType = function() {
    return this._controller._data_type;
}

ControllerProvider.prototype.setDataType = function(dataType) {
    this._controller._data_type = dataType;
    return this;
}

ControllerProvider.prototype.getFields = function(fieldsType) {
    return (fieldsType == "client") ? this._controller._client_fields : this._controller._server_fields;
}

ControllerProvider.prototype.getFieldsAnchors = function() {
    return this._controller._fields_anchors;
}

ControllerProvider.prototype.setFieldsAnchors = function(anchors) {
    for(var field in anchors)
        this._controller._fields_anchors[field] = anchors[field];

    return this;
}

ControllerProvider.prototype.isFieldMapped = function(field) {
    var fields = this.getFields("server");
    return fields.hasOwnProperty(field);
}

ControllerProvider.prototype.getUseOnlyMappedFields = function() {
    return this._controller._use_only_mapped_fields;
}

ControllerProvider.prototype.setDataLoadingType = function(dataLoadingType) {
    this._controller._data_loading_type = dataLoadingType;
    return this;
}

ControllerProvider.prototype.getDataLoadingType = function() {
    return this._controller._data_loading_type;
}

module.exports = ControllerProvider;