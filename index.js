var Promise = require("bluebird");

function getData(Model, collectionState) {
    return Model.getData(collectionState).then(function(data) {
        return {status: "read", data: data};
    });
}

function insertData(Model, data, collectionState) {
    return Model.insertData(data.data, collectionState).then(function(insertedData) {
        return {status: "inserted", source_id: data.id, target_id: insertedData.id || data.id};
    });
}

function updateData(Model, data, collectionState) {
    return Model.updateData(data.id, data.data, collectionState).then(function(updatedData) {
        return {status: "updated", source_id: data.id, target_id: updatedData.id || data.id};
    });
}

function moveData(Model, data, collectionState) {
    return Model.changeOrderData(data.id, data.move_id, collectionState).then(function(result) {
        return {status: "moved", source_id: data.id, target_id: data.id};
    });
}

function deleteData(Model, data, collectionState) {
    return Model.removeData(data.id, collectionState).then(function() {
        return {status: "deleted", source_id: data.id, target_id: data.id};
    });
}

function processRequest(Model, data, collectionState) {
    var actionPromise;
    switch(data.action) {
        case "read":
            actionPromise = getData(Model, collectionState);
            break;

        case "insert":
            actionPromise = insertData(Model, data, collectionState);
            break;

        case "update":
            actionPromise = updateData(Model, data, collectionState)
            break;

        case "move":
            actionPromise = moveData(Model, data, collectionState);
            break;

        case "delete":
            actionPromise = deleteData(Model, data, collectionState);
            break;

        default:
            actionPromise = new Promise(function(reject, resolve) {
                reject(new Error("Action '" + data.action + "' isn't support."));
            });
            break;
    }

    return actionPromise.error(function(error) {
        return {status: "error", error: error};
    });
}

function Controller(Model, Request) {
    debugger;
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

function _createControllerActionHandler(controllerObj, action) {
    return function(handling, handler) {
        var db = controllerObj._Model.getDb();
        
        if((arguments.length == 1) && (typeof handling == "function")) {
            handler = handling;
            handling = null;
        }

        var self = this;
        return function(request, response) {
            self._Request.processRequest(request, response, function(requestData, requestResolver) {

                var actionHandlerData = {handler_action: action, request_data: requestData};
                function _resolver(error, data) {

                    if(error) {
                        actionHandlerData.error = error;
                        controllerObj.processActionHandlerData(actionHandlerData, requestResolver);
                        return;
                    }

                    if(!!data && (typeof data == "object")) {
                        actionHandlerData.data = data;
                        controllerObj.processActionHandlerData(actionHandlerData, requestResolver);
                        return;
                    }

                    if((data === true) && (handling != null)) {
                        actionHandlerData.handling = handling;
                        controllerObj.processActionHandlerData(actionHandlerData, requestResolver);
                        return;
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
                    controllerObj.processActionHandlerData(actionHandlerData, requestResolver);
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

Controller.prototype.map = function(fields, useOnlyMappedFields) {
    var newObj = new Controller(this._Model, this._Request);
    newObj._fields = fields;
    newObj._field_id = fields.id || newObj._field_id;
    newObj._field_order = fields.order || newObj._field_order;
    newObj._use_only_mapped_fields = !!useOnlyMappedFields;

    for(var key in fields)
        newObj._client_fields[fields[key]] = key;

    return newObj;
}

Controller.prototype.db = function(db) {this._Model.setDb(db)};

//Controller.prototype.processActionHandlerData = function(request, response, state) {
Controller.prototype.processActionHandlerData = function(handlerData, callback) {
    if(handlerData.error) {
        callback({status: "error", error: handlerData.error});
        return;
    }

    var parsedRequestData = handlerData.request_data,
        action = parsedRequestData.action;

    var self = this,
        data = handlerData.data,
        collectionState = {handling: handlerData.handling, field_id: this._field_id, field_order: this._field_order};

    if(action == "read") {
        if(data) {
            data = _mapData(data, this._client_fields, this._use_only_mapped_fields);
            callback({status: "read", data: data});
            return;
        }

        processRequest(this._Model, {action: action}, collectionState).then(function(data) {
            if(data.status == "error") {
                callback(data);
                return;
            }

            data = _mapData(data.data, self._client_fields, self._use_only_mapped_fields);
            callback({status: "read", data: data});
        });
        return;
    }
    else if(handlerData.handler_action == "data")
        return;

    if(data)
        parsedRequestData.data = data;

    parsedRequestData.data = _mapData(parsedRequestData.data, this._fields, this._use_only_mapped_fields);

    processRequest(this._Model, parsedRequestData, collectionState).then(function(data) {
        callback(data);
    });
}

module.exports = function(Model, Request) {return new Controller(Model, Request);};