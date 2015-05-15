var Promise = require("bluebird");

/**
 * Get data.
 * @param {Object} Model - database model.
 * @param {Object} collectionState - data parameters.
 * @returns {Promise}
 */
function getData(Model, collectionState) {
    return Model.getData(collectionState).then(function(data) {
        return {status: "read", data: data};
    });
}

/**
 * Insert data.
 * @param {Object} Model - database model.
 * @param {Object} data - hash of data.
 * @param {Object} collectionState - data parameters.
 * @returns {Promise}
 */
function insertData(Model, data, collectionState) {
    return Model.insertData(data.data, collectionState).then(function(insertedData) {
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
function updateData(Model, data, collectionState) {
    return Model.updateData(data.id, data.data, collectionState).then(function(updatedData) {
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
function moveData(Model, data, collectionState) {
    return Model.changeOrderData(data.id, data.move_id, collectionState).then(function(result) {
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
function deleteData(Model, data, collectionState) {
    return Model.removeData(data.id, collectionState).then(function() {
        return {status: "deleted", source_id: data.id, target_id: data.id};
    });
}

function _processRequest(Model, data, collectionState) {
    var actionPromise;
    switch(data.action) {
        case "read":
            actionPromise = getData(Model, collectionState);
            break;

        case "insert":
            actionPromise = insertData(Model, data, collectionState);
            break;

        case "update":
            actionPromise = updateData(Model, data, collectionState);
            break;

        case "move":
            actionPromise = moveData(Model, data, collectionState);
            break;

        case "delete":
            actionPromise = deleteData(Model, data, collectionState);
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

    var parsedRequestData = handlerData.request_data,
        action = parsedRequestData.action,
        data = handlerData.data,
        collectionState = {handling: handlerData.handling, field_id: controllerObj._field_id, field_order: controllerObj._field_order};

    if(action == "read") {
        if(data) {
            data = _mapData(data, controllerObj._client_fields, controllerObj._use_only_mapped_fields);
            callback({status: "read", data: data});
            return true;
        }

        _processRequest(controllerObj._Model, {action: action}, collectionState).then(function(data) {
            if(data.status == "error") {
                callback(data);
                return true;
            }

            data = _mapData(data.data, controllerObj._client_fields, controllerObj._use_only_mapped_fields);
            callback({status: "read", data: data});
        });
        return true;
    }
    else if(handlerData.handler_action == "data")
        return false;

    if(data)
        parsedRequestData.data = data;

    parsedRequestData.data = _mapData(parsedRequestData.data, controllerObj._fields, controllerObj._use_only_mapped_fields);

    _processRequest(controllerObj._Model, parsedRequestData, collectionState).then(function(data) {
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
            controllerObj._Request.processRequest(request, response, function(requestData, requestResolver) {

                var actionHandlerData = {handler_action: action, request_data: requestData};
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
                        state.id = requestData.id;
                        state.data = requestData.data;
                        state.action = requestData.action;

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

function _mapData(data, mapData, useOnlyMapped) {

    function _map(data, mapData) {
        var mappedData = {};
        for(var key in data) {
            if(mapData.hasOwnProperty(key))
                mappedData[mapData[key]] = data[key];
            else if(!useOnlyMapped)
                mappedData[key] = data[key];
        }
        return mappedData;
    }

    var mappedData = [];
    if(data instanceof Array) {
        for(var i = 0; i < data.length; i++)
            mappedData.push(_map(data[i], mapData));
    }
    else
        mappedData = _map(data, mapData);

    return mappedData;
}

function Controller(Model, Request) {
    this._Model = Model;
    this._Request = Request;
    this._fields = {};
    this._field_id = "id";
    this._field_order = null;
    this._client_fields = {};
    this._use_only_mapped_fields = false;
    this.crud = _createControllerActionHandler(this, "crud");
    this.data = _createControllerActionHandler(this, "data");
}

/**
 * Set keys of data.
 * @param {Object} fields - hash of data to mapping. Example: {"title": "my_db_title"}
 * @param {boolean} useOnlyMappedFields
 * @returns {Controller}
 */
Controller.prototype.map = function(fields, useOnlyMappedFields) {
    var newObj = new Controller(this._Model, this._Request);
    newObj._fields = fields;
    newObj._field_id = fields.id || newObj._field_id;
    newObj._field_order = fields.order || newObj._field_order;
    newObj._use_only_mapped_fields = !!useOnlyMappedFields;

    for(var key in fields)
        newObj._client_fields[fields[key]] = key;

    return newObj;
};

/**
 * Set object or connect string db.
 * @param {Object} db
 */
Controller.prototype.db = function(db) {this._Model.setDb(db)};

module.exports = function(Model, Request) {return new Controller(Model, Request);};