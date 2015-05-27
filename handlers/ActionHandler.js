var DataHandler = require("./DataHandler"),
    Promise = require("bluebird"),
    _ = require("lodash");

function ActionHandler(controllerObj) {
    this.data_handler = new DataHandler(controllerObj);
    this.controller = controllerObj;
}

ActionHandler.prototype.processRequest = function(requestState, collectionState) {
    var actionPromise;
    switch(requestState.action) {
        case "read":
            actionPromise = this.data_handler.getData(collectionState);
            break;

        case "insert":
            actionPromise = this.data_handler.insertData(requestState, collectionState);
            break;

        case "update":
            actionPromise = this.data_handler.updateData(requestState, collectionState);
            break;

        case "move":
            actionPromise = this.data_handler.moveData(requestState, collectionState);
            break;

        case "delete":
            actionPromise = this.data_handler.deleteData(requestState, collectionState);
            break;

        default:
            actionPromise = new Promise(function(reject) {
                reject(new Error("Action '" + requestState.action + "' isn't support."));
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
    state.id = (this.data_handler.getFieldDataByAnchor(requestData.data, "id") || "").toString();
    //Delete id field or his anchor.
    requestData.data = this.data_handler.deleteFieldDataByAnchor(requestData.data, "id");
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
            self.controller.request.processRequest(state, function(requestData, requestResolver) {
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
                    var state = {db: self.controller.model.getDb(), response: response, request: request};
                    if(action != "crud")
                        handler.apply(null, [state, _resolver]);
                    else {
                        state = self.getRequestStateData(requestData, state);
                        state.data = self.data_handler.mapData(state.data, "server");
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
        collectionState = {
            handling: handlerData.handling,
            field_id: this.data_handler.getFieldByAnchor("id"),
            field_order: null
        };

    var fieldOrder = this.data_handler.getFieldByAnchor("order");
    if(this.controller.isFieldMapped())
        collectionState.field_order = fieldOrder;

    if(action == "read") {
        if(data) {
            data = this.data_handler.mapData(data, "client");
            callback({status: "read", data: data});
            return true;
        }

        var self = this;
        this.processRequest(requestStateData, collectionState).then(function(data) {
            if(data.status == "error") {
                callback(data);
                return true;
            }

            data = self.data_handler.mapData(data.data, "client");
            callback({status: "read", data: data});
        });
        return true;
    }
    else if(handlerData.handler_action == "data")
        return false;

    if(data)
        requestStateData.data = data;

    requestStateData.data = this.data_handler.mapData(requestStateData.data, "server");

    this.processRequest(requestStateData, collectionState).then(function(data) {
        callback(data);
    });
};

module.exports = ActionHandler;