var DataHandler = require("./DataHandler"),
    Promise = require("bluebird"),
    _ = require("lodash");

function ActionHandler(controllerObj) {
    var dataHandlerSettings = {
        model: controllerObj.model,
        data_type: controllerObj._data_type,
        use_only_mapped_fields: controllerObj._use_only_mapped_fields,
        client_fields: controllerObj._client_fields,
        server_fields: controllerObj._server_fields,
        fields_anchors: controllerObj._fields_anchors
    };

    this.scope = {
        data_handler: new DataHandler(dataHandlerSettings),
        request: controllerObj.request,
        fields_settings: controllerObj._fields_settings
    };

    this.getDb = controllerObj.getDb;
}

ActionHandler.prototype.processRequest = function(data, collectionState) {
    var actionPromise;
    switch(data.action) {
        case "read":
            actionPromise = this.scope.data_handler.getData(data, collectionState);
            break;

        case "insert":
            actionPromise = this.scope.data_handler.insertData(data, collectionState);
            break;

        case "update":
            actionPromise = this.scope.data_handler.updateData(data, collectionState);
            break;

        case "move":
            actionPromise = this.scope.data_handler.moveData(data, collectionState);
            break;

        case "delete":
            actionPromise = this.scope.data_handler.deleteData(data, collectionState);
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
};

ActionHandler.prototype.getRequestStateData = function(requestData, state) {
    state = state || {};
    requestData = _.clone(requestData, true);

    //Get id field or his anchor data.
    state.id = (this.scope.data_handler.getFieldData(requestData.data, "id") || "").toString();
    //Delete id field or his anchor.
    requestData.data = this.scope.data_handler.deleteFieldData(requestData.data, "id");
    state.action = state.action || requestData.action;
    delete requestData.action;
    state.data = requestData.data;
    return state;
};

ActionHandler.prototype.createActionHandler = function(action) {
    var self = this;

    return function(handling, handler) {
        if((arguments.length == 1) && (typeof handling == "function")) {
            handler = handling;
            handling = null;
        }

        return function(request, response) {
            var state = {request: request, response: response};
            self.scope.request.processRequest(state, function(requestData, requestResolver) {
                var requestStateData = self.getRequestStateData(requestData),
                    actionHandlerData = {handler_action: action, request_data: requestStateData};

                function _resolver(error, data) {
                    if(error) {
                        actionHandlerData.error = error;
                        self.processAction(actionHandlerData, requestResolver);
                        return false;
                    }

                    if(!!data && (typeof data == "object")) {
                        actionHandlerData.data = data;
                        self.processAction(actionHandlerData, requestResolver);
                        return true;
                    }

                    if((data === true) && (handling != null)) {
                        actionHandlerData.handling = handling;
                        self.processAction(actionHandlerData, requestResolver);
                        return true;
                    }
                }

                if(handler) {
                    var state = {db: self.getDb(), response: response, request: request};
                    if(action != "crud")
                        handler.apply(null, [state, _resolver]);
                    else {
                        state = self.getRequestStateData(requestData, state);
                        state.data = self.scope.data_handler.mapData(state.data, "server");
                        handler.apply(null, [state, _resolver]);
                    }
                }
                else if(handling != null) {
                    actionHandlerData.handling = handling;
                    self.processAction(actionHandlerData, requestResolver);
                }
            });
        }
    }
};

ActionHandler.prototype.processAction = function(handlerData, callback) {
    if(handlerData.error) {
        callback({status: "error", error: handlerData.error});
        return false;
    }

    var requestStateData = handlerData.request_data,
        action = requestStateData.action,
        data = handlerData.data,
        collectionState = {handling: handlerData.handling, field_id: this.scope.fields_settings.id, field_order: this.scope.fields_settings.order};

    if(action == "read") {
        if(data) {
            data = this.scope.data_handler.mapData(data, "client");
            callback({status: "read", data: data});
            return true;
        }

        var self = this;
        this.processRequest(requestStateData, collectionState).then(function(data) {
            if(data.status == "error") {
                callback(data);
                return true;
            }

            data = self.scope.data_handler.mapData(data.data, "client");
            callback({status: "read", data: data});
        });
        return true;
    }
    else if(handlerData.handler_action == "data")
        return false;

    if(data)
        requestStateData.data = data;

    requestStateData.data = this.scope.data_handler.mapData(requestStateData.data, "server");

    this.processRequest(requestStateData, collectionState).then(function(data) {
        callback(data);
    });
};

module.exports = ActionHandler;