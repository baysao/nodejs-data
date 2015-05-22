var Promise = require("bluebird"),
    _ = require("lodash");

const FIELD_ID = "id";
const FIELD_ORDER = "order";
const FIELD_PARENT_ID = "parent_id";

/**
 * Get data.
 * @param {Controller} controllerObj - controller object.
 * @param {Object} collectionState - data parameters.
 * @returns {Promise}
 */
function getData(controllerObj, data, collectionState) {
    return controllerObj._Model.getData(collectionState).then(function(data) {
        if(controllerObj._data_type == "tree")
            data = _dataToTree(data);

        return {status: "read", data: data};
    });

    function _dataToTree(data) {

        var dataHash = _arrayToHash(data, "id"),
            rootElements = [];

        for(var key in dataHash) {
            var data = dataHash[key],
                parentId = data[FIELD_PARENT_ID];

            if(!dataHash.hasOwnProperty(parentId)) {
                rootElements.push(data);
                continue;
            }

            var parent = dataHash[parentId];
            parent.data = parent.data || [];
            parent.data.push(data);
        }

        return rootElements;
    }
}

function _arrayToHash(dataArray, keyField) {
    var hash = {};
    for(var i = 0; i < dataArray.length; i++) {
        var data = dataArray[i],
            key = data[keyField];

        hash[key] = data;
    }
    return hash;
}

/**
 * Insert data.
 * @param {Object} Model - database model.
 * @param {Object} data - hash of data.
 * @param {Object} collectionState - data parameters.
 * @returns {Promise}
 */
function insertData(controllerObj, data, collectionState) {
    return controllerObj._Model.insertData(data.data, collectionState).then(function(insertedData) {
        return {status: "inserted", source_id: data.id, target_id: insertedData.id || data.id};
    });
}

/**
 * Update data.
 * @param {Object} Model - database model.
 * @param {Object} data - hash of data to update.
 * @param {Object} collectionState - data parameters.
 * @returns {Promise}
 */
function updateData(controllerObj, data, collectionState) {
    return controllerObj._Model.updateData(data.id, data.data, collectionState).then(function(updatedData) {
        return {status: "updated", source_id: data.id, target_id: updatedData.id || data.id};
    });
}

/**
 * Update data.
 * @param {Object} Model - database model.
 * @param {Object} data - contains ids for ordering. {id: ..., move_id: ...}
 * @param {Object} collectionState - data parameters.
 * @returns {Promise}
 */
function moveData(controllerObj, data, collectionState) {
    return controllerObj._Model.changeOrderData(data.id, data.move_id, collectionState).then(function(result) {
        return {status: "moved", source_id: data.id, target_id: data.id};
    });
}

/**
 * Delete data.
 * @param {Object} Model - database model.
 * @param {Object} data - contains property 'id' for deleting.
 * @param {Object} collectionState - data parameters.
 * @returns {Promise}
 */
function deleteData(controllerObj, data, collectionState) {
    return controllerObj._Model.removeData(data.id, collectionState).then(function() {
        return {status: "deleted", source_id: data.id, target_id: data.id};
    });
}

function _processRequest(controllerObj, data, collectionState) {
    var actionPromise;
    switch(data.action) {
        case "read":
            actionPromise = getData(controllerObj, data, collectionState);
            break;

        case "insert":
            actionPromise = insertData(controllerObj, data, collectionState);
            break;

        case "update":
            actionPromise = updateData(controllerObj, data, collectionState);
            break;

        case "move":
            actionPromise = moveData(controllerObj, data, collectionState);
            break;

        case "delete":
            actionPromise = deleteData(controllerObj, data, collectionState);
            break;

        default:
            actionPromise = new Promise(function(reject) {
                reject(new Error("Action '" + data.action + "' isn't support."));
            });
            break;
    }

    return actionPromise.error(function(error) {
        return {status: "error", error: error};
    });
}

function _processActionHandlerData(controllerObj, handlerData, callback) {
    if(handlerData.error) {
        callback({status: "error", error: handlerData.error});
        return false;
    }

    var requestStateData = handlerData.request_data,
        action = requestStateData.action,
        data = handlerData.data,
        collectionState = {handling: handlerData.handling, field_id: controllerObj._fields_settings.id, field_order: controllerObj._fields_settings.order};

    if(action == "read") {
        if(data) {
            data = _mapData(controllerObj, data, "client");
            callback({status: "read", data: data});
            return true;
        }

        _processRequest(controllerObj, requestStateData, collectionState).then(function(data) {
            if(data.status == "error") {
                callback(data);
                return true;
            }

            data = _mapData(controllerObj, data.data, "client");
            callback({status: "read", data: data});
        });
        return true;
    }
    else if(handlerData.handler_action == "data")
        return false;

    if(data)
        requestStateData.data = data;

    requestStateData.data = _mapData(controllerObj, requestStateData.data, "server");

    _processRequest(controllerObj, requestStateData, collectionState).then(function(data) {
        callback(data);
    });
}

function _createControllerActionHandler(controllerObj, action) {
    return function(handling, handler) {
        var db = controllerObj._Model.getDb();

        if((arguments.length == 1) && (typeof handling == "function")) {
            handler = handling;
            handling = null;
        }

        return function(request, response) {
            var state = {request: request, response: response};
            controllerObj._Request.processRequest(state, function(requestData, requestResolver) {
                var requestStateData = _getRequestStateData(controllerObj, requestData),
                    actionHandlerData = {handler_action: action, request_data: requestStateData};

                function _resolver(error, data) {
                    if(error) {
                        actionHandlerData.error = error;
                        _processActionHandlerData(controllerObj, actionHandlerData, requestResolver);
                        return false;
                    }

                    if(!!data && (typeof data == "object")) {
                        actionHandlerData.data = data;
                        _processActionHandlerData(controllerObj, actionHandlerData, requestResolver);
                        return true;
                    }

                    if((data === true) && (handling != null)) {
                        actionHandlerData.handling = handling;
                        _processActionHandlerData(controllerObj, actionHandlerData, requestResolver);
                        return true;
                    }
                }

                if(handler) {
                    var state = {db: db, response: response, request: request};
                    if(action != "crud")
                        handler.apply(null, [state, _resolver]);
                    else {
                        state = _getRequestStateData(controllerObj, requestData, state);
                        state.data = _mapData(controllerObj, state.data, "server");
                        handler.apply(null, [state, _resolver]);
                    }
                }
                else if(handling != null) {
                    actionHandlerData.handling = handling;
                    _processActionHandlerData(controllerObj, actionHandlerData, requestResolver);
                }
            });
        }
    }
}

function _getRequestStateData(controllerObj, requestData, state) {
    state = state || {};
    requestData = _.clone(requestData, true);

    var fieldsAnchors = controllerObj._fields_anchors,
        fieldId = fieldsAnchors.id || "id";

    state.id = (requestData.data[fieldId] || "").toString();
    delete requestData.data[fieldId];
    state.action = state.action || requestData.action;
    delete requestData.action;
    state.data = requestData.data;
    return state;
}

function _mapData(controllerObj, data, fieldsType) {

    function _getFieldByAnchor(field, fieldsAnchors) {
        for(var key in fieldsAnchors) {
            if(field == fieldsAnchors[key])
                return key;
        }
    }

    function _map(data, fields, fieldsAnchors, useOnlyMapped) {
        var mappedData = Array.isArray(data) ? [] : {};
        for(var key in data) {
            var fieldByAnchor = _getFieldByAnchor(key, fieldsAnchors);
            if(fields.hasOwnProperty(key) || fieldByAnchor)
                mappedData[fields[key] || fieldByAnchor] = data[key];
            else if(!useOnlyMapped)
                mappedData[key] = data[key];
        }
        return mappedData;
    }

    var mappedData = [],
        fields = (fieldsType == "client") ? controllerObj._client_fields : controllerObj._server_fields,
        fieldsAnchors = controllerObj._fields_anchors,
        useOnlyMapped = controllerObj._use_only_mapped_fields;

    //if(controllerObj._data_type == "tree") {
    //    debugger;
    //    for(var key in data) {
    //        var currentData = data[key];
    //
    //        if(typeof currentData == "object") {
    //            data[key] = _mapData(controllerObj, currentData, fieldsType);
    //        }
    //    }
    //
    //    return _map(data, fields, fieldsAnchors, useOnlyMapped);
    //}

    for(var key in data) {
        var currentData = data[key];

        if(typeof currentData == "object") {
            data[key] = _mapData(controllerObj, currentData, fieldsType);
        }

    }

    return _map(data, fields, fieldsAnchors, useOnlyMapped);

    //if(data instanceof Array) {
    //    for(var i = 0; i < data.length; i++)
    //        mappedData.push(_map(data[i], fields, fieldsAnchors, useOnlyMapped));
    //}
    //else
    //    mappedData = _map(data, fields, fieldsAnchors, useOnlyMapped);

    //return mappedData;
}

function Controller(Model, Request) {
    this._Model = Model;
    this._Request = Request;
    this._data_type = "";
    this._server_fields = {};
    this._client_fields = {};
    this._fields_settings = {id: "id", order: null};
    this._fields_anchors = {id: "id", order: "order"};
    this._use_only_mapped_fields = false;
    this.crud = _createControllerActionHandler(this, "crud");
    this.data = _createControllerActionHandler(this, "data");
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
    var newObj = new Controller(this._Model, this._Request);
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
Controller.prototype.db = function(db) {this._Model.setDb(db);};

Controller.prototype.tree = function(db) {
    this.setFieldsAnchors({parent_id: "parent"});
    this._data_type = "tree";
    this.db(db);
};

module.exports = function(Model, Request) {return new Controller(Model, Request);};